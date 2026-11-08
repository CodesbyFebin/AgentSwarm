use agentswarm::{Agent, create_task, run_swarm, demo_manifest};
use serde_json::json;
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 { eprintln!("Usage: agentswarm <demo|schedule>"); std::process::exit(2); }
    match args[1].as_str() {
        "demo" => {
            let issuer = Agent::new("coordinator", vec!["coordinate".into()]);
            let a1 = Agent::new("worker-1", vec!["process-images".into(), "sum".into()]);
            let a2 = Agent::new("worker-2", vec!["sum".into()]);
            let tasks = vec![
                create_task(&issuer, "task-001", "sum-revenue", "sum", json!({"revenue": 100}), "nonce-1"),
                create_task(&issuer, "task-002", "sum-revenue", "sum", json!({"revenue": 250}), "nonce-2"),
            ];
            let manifests = vec![demo_manifest(&a1), demo_manifest(&a2)];
            let (assign, ledger, receipt) = run_swarm(&tasks, &issuer, &[a1, a2], &manifests).unwrap();
            println!("assignments {} ledger {} receipt {}", assign.len(), ledger.entries.len(), receipt);
            for a in assign { println!("{} -> {} ({})", a.task_id, a.agent_name, a.agent_did); }
        }
        _ => { eprintln!("Usage: agentswarm <demo>"); std::process::exit(2); }
    }
}
