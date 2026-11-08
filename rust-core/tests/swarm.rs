use agentswarm::{Agent, create_task, verify_task, schedule, run_swarm, demo_manifest, create_manifest, verify_manifest, Ledger};
use serde_json::json;
#[test]
fn registry_sign_verify() {
    let a = Agent::new("w1", vec!["sum".into()]);
    let msg = b"hello-swarm";
    let sig = a.sign(msg);
    assert!(a.verify(msg, &sig));
    assert!(!a.verify(b"tampered", &sig));
}
#[test]
fn manifest_hash_deterministic() {
    let a = Agent::new("w1", vec!["sum".into()]);
    let m1 = create_manifest(&a.did, "w1", vec!["sum".into()], 4);
    let m2 = create_manifest(&a.did, "w1", vec!["sum".into()], 4);
    assert_eq!(m1.hash, m2.hash);
    assert!(verify_manifest(&m1).is_ok());
}
#[test]
fn task_requires_signature() {
    let issuer = Agent::new("coord", vec!["coordinate".into()]);
    let mut t = create_task(&issuer, "t1", "sum", "sum", json!({"revenue": 100}), "n1");
    assert!(verify_task(&t, &issuer).is_ok());
    t.payload = json!({"revenue": 999});
    assert!(verify_task(&t, &issuer).is_err());
}
#[test]
fn swarm_deterministic_schedule() {
    let issuer = Agent::new("coord", vec!["coordinate".into()]);
    let a1 = Agent::new("w1", vec!["sum".into()]);
    let a2 = Agent::new("w2", vec!["sum".into()]);
    let tasks = vec![
        create_task(&issuer, "task-002", "sum", "sum", json!({}), "n2"),
        create_task(&issuer, "task-001", "sum", "sum", json!({}), "n1"),
    ];
    let s1 = schedule(&tasks, &[a1.clone(), a2.clone()]).unwrap();
    let s2 = schedule(&tasks, &[a2, a1]).unwrap();
    assert_eq!(s1[0].task_id, "task-001");
    assert_eq!(s1.len(), s2.len());
}
#[test]
fn ledger_tamper_breaks() {
    let mut l = Ledger::new();
    l.append("t1", "did:1", "COMPLETED", "abc");
    l.append("t2", "did:2", "COMPLETED", "def");
    assert!(l.verify().is_ok());
    l.entries[1].status = "TAMPERED".into();
    assert!(l.verify().is_err());
}
#[test]
fn swarm_run_held_and_verified() {
    let issuer = Agent::new("coord", vec!["coordinate".into()]);
    let a1 = Agent::new("w1", vec!["sum".into()]);
    let a2 = Agent::new("w2", vec!["sum".into()]);
    let tasks = vec![create_task(&issuer, "task-001", "sum", "sum", json!({"revenue":100}), "n1")];
    let manifests = vec![demo_manifest(&a1), demo_manifest(&a2)];
    let (assign, ledger, receipt) = run_swarm(&tasks, &issuer, &[a1, a2], &manifests).unwrap();
    assert_eq!(assign.len(), 1);
    assert!(ledger.verify().is_ok());
    assert!(receipt.contains("ledgerVerified"));
}
