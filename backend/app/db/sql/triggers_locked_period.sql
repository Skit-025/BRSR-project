-- PostgreSQL Trigger: Locked Period Data Immutability
-- Prevents any modifications to submissions and data points when the parent reporting period is locked.

CREATE OR REPLACE FUNCTION fn_prevent_locked_period_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_is_locked BOOLEAN;
    v_period_id VARCHAR(64);
BEGIN
    IF TG_TABLE_NAME = 'submissions' THEN
        v_period_id := NEW.period_id;
    ELSIF TG_TABLE_NAME = 'data_points' THEN
        SELECT s.period_id INTO v_period_id
        FROM submissions s
        WHERE s.id = NEW.submission_id;
    END IF;

    IF v_period_id IS NOT NULL THEN
        SELECT is_locked INTO v_is_locked
        FROM reporting_periods
        WHERE id = v_period_id;

        IF v_is_locked IS TRUE THEN
            RAISE EXCEPTION 'Reporting period % is LOCKED. No modifications permitted.', v_period_id
                USING ERRCODE = '55001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
