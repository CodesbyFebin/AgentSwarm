BEGIN;
DO $$
DECLARE t swarm_tasks; retry swarm_tasks; leased swarm_tasks; reclaimed swarm_tasks;
  rejected boolean; n bigint;
BEGIN
  INSERT INTO swarm_accounts(identity,available_micro_usdc) VALUES('test:alice',10000);
  SELECT * INTO t FROM swarm_enqueue('test:alice','one',repeat('a',64),'{"x":1}',3000);
  SELECT * INTO retry FROM swarm_enqueue('test:alice','one',repeat('a',64),'{"x":1}',3000);
  IF t.id <> retry.id THEN RAISE EXCEPTION 'duplicate task'; END IF;
  SELECT available_micro_usdc INTO n FROM swarm_accounts WHERE identity='test:alice';
  IF n <> 7000 THEN RAISE EXCEPTION 'duplicate reservation'; END IF;
  rejected := false;
  BEGIN
    PERFORM swarm_enqueue('test:alice','one',repeat('b',64),'{"x":2}',3000);
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'conflicting request accepted'; END IF;
  rejected := false;
  BEGIN
    PERFORM swarm_enqueue('test:alice','two',repeat('a',64),'{}',8000);
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'overspend accepted'; END IF;
  SELECT * INTO leased FROM swarm_claim('worker-a',30);
  IF leased.id <> t.id THEN RAISE EXCEPTION 'wrong task claimed: use an empty test database'; END IF;
  -- Force expiry without waiting, then reclaim with a fresh fencing token.
  UPDATE swarm_tasks SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=t.id;
  SELECT * INTO reclaimed FROM swarm_claim('worker-b',30);
  IF reclaimed.id <> t.id OR reclaimed.lease_token=leased.lease_token THEN RAISE EXCEPTION 'bad reclaim'; END IF;
  rejected := false;
  BEGIN
    PERFORM swarm_finish(t.id,'worker-a',leased.lease_token,'{}');
  EXCEPTION WHEN OTHERS THEN rejected := true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale worker accepted'; END IF;
  PERFORM swarm_finish(t.id,'worker-b',reclaimed.lease_token,'{"ok":true}');
  PERFORM swarm_finish(t.id,'worker-b',reclaimed.lease_token,'{"ok":true}');
  SELECT count(*) INTO n FROM swarm_ledger WHERE task_id=t.id AND kind='CAPTURE';
  IF n <> 1 THEN RAISE EXCEPTION 'duplicate capture'; END IF;
  SELECT reserved_micro_usdc INTO n FROM swarm_accounts WHERE identity='test:alice';
  IF n <> 0 THEN RAISE EXCEPTION 'reservation not cleared'; END IF;
  SELECT * INTO t FROM swarm_enqueue('test:alice','three',repeat('c',64),'{}',2000);
  PERFORM swarm_cancel(t.id); PERFORM swarm_cancel(t.id);
  SELECT available_micro_usdc INTO n FROM swarm_accounts WHERE identity='test:alice';
  IF n <> 7000 THEN RAISE EXCEPTION 'incorrect refund'; END IF;
  SELECT count(*) INTO n FROM swarm_ledger WHERE task_id=t.id AND kind='RELEASE';
  IF n <> 1 THEN RAISE EXCEPTION 'duplicate release'; END IF;
END $$;
ROLLBACK;
