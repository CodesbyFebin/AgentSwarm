-- PostgreSQL foundation; amounts use integer micro-USDC, never floating point.
CREATE TABLE swarm_accounts (
  identity text PRIMARY KEY,
  available_micro_usdc bigint NOT NULL CHECK (available_micro_usdc >= 0),
  reserved_micro_usdc bigint NOT NULL DEFAULT 0 CHECK (reserved_micro_usdc >= 0)
);
CREATE TABLE swarm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity text NOT NULL REFERENCES swarm_accounts(identity),
  request_id text NOT NULL,
  payload_hash text NOT NULL CHECK (length(payload_hash) = 64),
  payload jsonb NOT NULL,
  fee_micro_usdc bigint NOT NULL CHECK (fee_micro_usdc > 0),
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','LEASED','COMPLETED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  result jsonb,
  UNIQUE(identity, request_id)
);
CREATE INDEX swarm_tasks_claim ON swarm_tasks(status, created_at);
CREATE TABLE swarm_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES swarm_tasks(id),
  identity text NOT NULL REFERENCES swarm_accounts(identity),
  kind text NOT NULL CHECK (kind IN ('RESERVE','CAPTURE','RELEASE')),
  amount_micro_usdc bigint NOT NULL CHECK (amount_micro_usdc > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(task_id, kind)
);
CREATE TABLE swarm_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES swarm_tasks(id),
  kind text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Only trusted gateway/worker database roles may call these functions. Do not
-- grant browser clients SQL access. Functions run with caller privileges.
CREATE FUNCTION swarm_enqueue(p_identity text, p_request_id text, p_hash text,
  p_payload jsonb, p_fee bigint) RETURNS SETOF swarm_tasks LANGUAGE plpgsql AS $$
DECLARE existing swarm_tasks; task swarm_tasks;
BEGIN
  IF p_fee <= 0 OR length(p_hash) <> 64 OR length(p_request_id) = 0 THEN
    RAISE EXCEPTION 'invalid task';
  END IF;
  -- Account lock serializes same-account reservations and idempotency checks.
  PERFORM 1 FROM swarm_accounts WHERE identity = p_identity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown account'; END IF;
  SELECT * INTO existing FROM swarm_tasks WHERE identity=p_identity AND request_id=p_request_id;
  IF FOUND THEN
    IF existing.payload_hash <> p_hash OR existing.payload <> p_payload OR existing.fee_micro_usdc <> p_fee THEN
      RAISE EXCEPTION 'idempotency key reused with different request';
    END IF;
    RETURN NEXT existing; RETURN;
  END IF;
  UPDATE swarm_accounts SET available_micro_usdc=available_micro_usdc-p_fee,
    reserved_micro_usdc=reserved_micro_usdc+p_fee
    WHERE identity=p_identity AND available_micro_usdc >= p_fee;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient budget'; END IF;
  INSERT INTO swarm_tasks(identity,request_id,payload_hash,payload,fee_micro_usdc)
    VALUES(p_identity,p_request_id,p_hash,p_payload,p_fee) RETURNING * INTO task;
  INSERT INTO swarm_ledger(task_id,identity,kind,amount_micro_usdc)
    VALUES(task.id,p_identity,'RESERVE',p_fee);
  INSERT INTO swarm_events(task_id,kind) VALUES(task.id,'TASK_QUEUED');
  RETURN NEXT task;
END $$;
CREATE FUNCTION swarm_claim(p_worker text, p_seconds integer DEFAULT 30)
RETURNS SETOF swarm_tasks LANGUAGE plpgsql AS $$
DECLARE task swarm_tasks;
BEGIN
  IF p_worker IS NULL OR length(p_worker)=0 OR p_seconds IS NULL OR p_seconds NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'invalid lease'; END IF;
  SELECT * INTO task FROM swarm_tasks
    WHERE status='QUEUED' OR (status='LEASED' AND lease_expires_at <= clock_timestamp())
    ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE swarm_tasks SET status='LEASED', lease_owner=p_worker,
    lease_token=gen_random_uuid(), lease_expires_at=clock_timestamp()+make_interval(secs=>p_seconds)
    WHERE id=task.id RETURNING * INTO task;
  INSERT INTO swarm_events(task_id,kind,details)
    VALUES(task.id,'TASK_LEASED',jsonb_build_object('worker',p_worker));
  RETURN NEXT task;
END $$;
CREATE FUNCTION swarm_finish(p_id uuid,p_worker text,p_token uuid,p_result jsonb)
RETURNS SETOF swarm_tasks LANGUAGE plpgsql AS $$
DECLARE task swarm_tasks;
BEGIN
  SELECT * INTO task FROM swarm_tasks WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR task.lease_owner IS DISTINCT FROM p_worker OR task.lease_token IS DISTINCT FROM p_token THEN
    RAISE EXCEPTION 'invalid lease';
  END IF;
  -- Retrying a successful completion returns the original result without charging twice.
  IF task.status='COMPLETED' THEN RETURN NEXT task; RETURN; END IF;
  IF task.status <> 'LEASED' OR task.lease_expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'expired lease';
  END IF;
  UPDATE swarm_accounts SET reserved_micro_usdc=reserved_micro_usdc-task.fee_micro_usdc
    WHERE identity=task.identity;
  UPDATE swarm_tasks SET status='COMPLETED',result=p_result WHERE id=p_id RETURNING * INTO task;
  INSERT INTO swarm_ledger(task_id,identity,kind,amount_micro_usdc)
    VALUES(task.id,task.identity,'CAPTURE',task.fee_micro_usdc);
  INSERT INTO swarm_events(task_id,kind) VALUES(task.id,'TASK_COMPLETED');
  RETURN NEXT task;
END $$;
CREATE FUNCTION swarm_cancel(p_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE task swarm_tasks;
BEGIN
  SELECT * INTO task FROM swarm_tasks WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown task'; END IF;
  IF task.status='CANCELLED' THEN RETURN; END IF;
  IF task.status='COMPLETED' THEN RAISE EXCEPTION 'already completed'; END IF;
  UPDATE swarm_accounts SET available_micro_usdc=available_micro_usdc+task.fee_micro_usdc,
    reserved_micro_usdc=reserved_micro_usdc-task.fee_micro_usdc WHERE identity=task.identity;
  UPDATE swarm_tasks SET status='CANCELLED',lease_token=NULL WHERE id=p_id;
  INSERT INTO swarm_ledger(task_id,identity,kind,amount_micro_usdc)
    VALUES(task.id,task.identity,'RELEASE',task.fee_micro_usdc);
  INSERT INTO swarm_events(task_id,kind) VALUES(task.id,'TASK_CANCELLED');
END $$;

-- Notifications are wake-up hints; consumers must read durable rows after commit.
-- Keep payload below PostgreSQL limits and avoid broadcasting private event data.
CREATE FUNCTION swarm_notify_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('swarm_events', json_build_object('event_id', NEW.id)::text);
  RETURN NEW;
END $$;
CREATE TRIGGER swarm_event_notification AFTER INSERT ON swarm_events
  FOR EACH ROW EXECUTE FUNCTION swarm_notify_event();
