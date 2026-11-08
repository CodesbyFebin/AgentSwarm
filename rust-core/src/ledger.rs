use serde_json::{json, Value};
use crate::canonical::canonical_hash;
#[derive(Clone, Debug)]
pub struct LedgerEntry { pub index: u64, pub task_id: String, pub agent_did: String, pub status: String, pub output_hash: String, pub prev_hash: String, pub hash: String }
#[derive(Clone, Debug, Default)]
pub struct Ledger { pub entries: Vec<LedgerEntry> }
impl Ledger {
    pub fn new() -> Self { Self { entries: Vec::new() } }
    pub fn append(&mut self, task_id: &str, agent_did: &str, status: &str, output_hash: &str) -> LedgerEntry {
        let prev = self.entries.last().map(|e| e.hash.clone()).unwrap_or_else(|| "genesis".to_string());
        let v = json!({"index": self.entries.len(), "taskId": task_id, "agentDid": agent_did, "status": status, "outputHash": output_hash, "prevHash": prev});
        let hash = canonical_hash(&v);
        let e = LedgerEntry { index: self.entries.len() as u64, task_id: task_id.to_string(), agent_did: agent_did.to_string(), status: status.to_string(), output_hash: output_hash.to_string(), prev_hash: prev, hash };
        self.entries.push(e.clone()); e
    }
    pub fn verify(&self) -> Result<(), String> {
        for (i, e) in self.entries.iter().enumerate() {
            if e.index != i as u64 { return Err("LEDGER_INDEX_MISMATCH".into()); }
            let prev = if i==0 { "genesis".to_string() } else { self.entries[i-1].hash.clone() };
            if e.prev_hash != prev { return Err("LEDGER_PREV_MISMATCH".into()); }
            let v = json!({"index": e.index, "taskId": e.task_id, "agentDid": e.agent_did, "status": e.status, "outputHash": e.output_hash, "prevHash": e.prev_hash});
            if canonical_hash(&v) != e.hash { return Err("LEDGER_HASH_MISMATCH".into()); }
        }
        Ok(())
    }
}
