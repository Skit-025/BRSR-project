-- PostgreSQL Trigger: Append-Only Immutable Enforcement
-- Prevents UPDATE or DELETE on audit logs and sealed snapshots

CREATE OR REPLACE FUNCTION fn_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Immutable Table: UPDATE and DELETE operations are prohibited on audit and lineage records (Table: %)', TG_TABLE_NAME
        USING ERRCODE = '55000';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to audit_events table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_events') THEN
        DROP TRIGGER IF EXISTS trg_audit_events_immutable ON audit_events;
        CREATE TRIGGER trg_audit_events_immutable
        BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW
        EXECUTE FUNCTION fn_prevent_audit_modification();
    END IF;
END $$;
