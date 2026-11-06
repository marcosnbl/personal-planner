import type { SupabaseClient } from "@supabase/supabase-js";
import { parseBackup } from "@/lib/training";
import { emptyDocument, type RemoteStore } from "@/lib/cloud-sync";

export function createRemoteStore(
  client: SupabaseClient,
  owner: string,
): RemoteStore {
  return {
    async load(knownRevision) {
      if (knownRevision !== undefined) {
        const { data, error } = await client
          .from("training_documents")
          .select("revision")
          .eq("user_id", owner)
          .maybeSingle();

        if (error) throw error;
        if (Number(data?.revision ?? 0) === knownRevision) return null;
      }

      const { data, error } = await client
        .from("training_documents")
        .select("revision,document")
        .eq("user_id", owner)
        .maybeSingle();

      if (error) throw error;
      return data
        ? {
            revision: Number(data.revision),
            document: parseBackup(JSON.stringify(data.document)),
          }
        : { revision: 0, document: emptyDocument() };
    },
    async save(document, revision) {
      const { data, error } = await client.rpc("save_training_document", {
        p_owner: owner,
        p_expected_revision: revision,
        p_document: document,
      });

      if (error) throw new Error(error.message);
      return { revision: Number(data.revision), document };
    },
  };
}
