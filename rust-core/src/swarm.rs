use serde_json::{json, Value};
use crate::agent::Agent;
use crate::canonical::{canonical_hash, canonical_stringify};
use crate::ledger::Ledger;
use crate::manifest::{create_manifest, verify_manifest, Manifest};

#[derive(Clone, Debug)]
pub struct SignedTask { pub id: String, pub intent: String, pub capability: String, pub payload: Value, pub issuer_did: String, pub signature: String, pub nonce: String }
pub fn create_task(issuer: &Agent, id: &str, intent: &str, capability: &str, payload: Value, nonce: &str) -> SignedTask {
    let unsigned = json!({"id": id, "intent": intent, "capability": capability, "payload": payload, "issuerDid": issuer.did, "nonce": nonce});
    let sig = issuer.sign(canonical_stringify(&unsigned).as_bytes());
    SignedTask { id: id.to_string(), intent: intent.to_string(), capability: capability.to_string(), payload, issuer_did: issuer.did.clone(), signature: sig, nonce: nonce.to_string() }
}
pub fn verify_task(task: &SignedTask, issuer: &Agent) -> Result<(), String> {
    if task.issuer_did != issuer.did { return Err("TASK_ISSUER_MISMATCH".into()); }
    let unsigned = json!({"id": task.id, "intent": task.intent, "capability": task.capability, "payload": task.payload, "issuerDid": task.issuer_did, "nonce": task.nonce});
    if !issuer.verify(canonical_stringify(&unsigned).as_bytes(), &task.signature) { return Err("BAD_TASK_SIGNATURE".into()); }
    Ok(())
}
#[derive(Clone, Debug)]
pub struct Assignment { pub task_id: String, pub agent_did: String, pub agent_name: String }
pub fn schedule(tasks: &[SignedTask], agents: &[Agent]) -> Result<Vec<Assignment>, String> {
    if agents.is_empty() { return Err("SWARM_NO_AGENTS".into()); }
    // Deterministic: sort tasks by id, agents by DID, round-robin. No random, no time.
    let mut sorted_tasks = tasks.to_vec();
    sorted_tasks.sort_by(|a,b| a.id.cmp(&b.id));
    let mut sorted_agents: Vec<Agent> = agents.to_vec();
    sorted_agents.sort_by(|a,b| a.did.cmp(&b.did));
    let mut out = Vec::new();
    for (i, t) in sorted_tasks.iter().enumerate() {
        // Find first agent with capability, round-robin starting at i
        let mut chosen: Option<&Agent> = None;
        for k in 0..sorted_agents.len() {
            let cand = &sorted_agents[(i+k)%sorted_agents.len()];
            if cand.capabilities.contains(&t.capability) { chosen = Some(cand); break; }
        }
        let a = chosen.ok_or_else(|| format!("NO_AGENT_FOR_CAPABILITY:{}", t.capability))?;
        out.push(Assignment { task_id: t.id.clone(), agent_did: a.did.clone(), agent_name: a.name.clone() });
    }
    Ok(out)
}
pub fn run_swarm(tasks: &[SignedTask], issuer: &Agent, agents: &[Agent], manifests: &[Manifest]) -> Result<(Vec<Assignment>, Ledger, String), String> {
    // Fail-closed admission: every task signed, every manifest valid
    for t in tasks { verify_task(t, issuer)?; }
    for m in manifests { verify_manifest(m)?; }
    if manifests.len() != agents.len() { return Err("MANIFEST_AGENT_COUNT_MISMATCH".into()); }
    let assignments = schedule(tasks, agents)?;
    let mut ledger = Ledger::new();
    for a in &assignments {
        let task = tasks.iter().find(|x| x.id==a.task_id).unwrap();
        let out = json!({"taskId": task.id, "agentDid": a.agent_did, "intent": task.intent});
        ledger.append(&task.id, &a.agent_did, "COMPLETED", &canonical_hash(&out));
    }
    let receipt = json!({"assignments": assignments.len(), "ledgerEntries": ledger.entries.len(), "ledgerVerified": ledger.verify().is_ok(), "deterministic": true});
    Ok((assignments, ledger, canonical_stringify(&receipt)))
}
pub fn demo_manifest(agent: &Agent) -> Manifest { create_manifest(&agent.did, &agent.name, agent.capabilities.clone(), 4) }
