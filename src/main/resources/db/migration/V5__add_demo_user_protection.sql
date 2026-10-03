-- The demo account: one shared user that visitors can try the product with.
ALTER TABLE users
	ADD COLUMN demo BOOLEAN NOT NULL DEFAULT FALSE;

-- There can be only one demo user
CREATE UNIQUE INDEX users_single_demo_idx ON users (demo) WHERE demo;

-- The demo user cannot be deleted, and its email, password and demo flag cannot be changed.
-- This is checked by the database itself, so it also holds for code that is written later.
CREATE FUNCTION protect_demo_user() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'The demo user cannot be deleted';
	END IF;
	IF NEW.password_hash IS DISTINCT FROM OLD.password_hash
			OR NEW.email IS DISTINCT FROM OLD.email
			OR NEW.demo IS DISTINCT FROM OLD.demo THEN
		RAISE EXCEPTION 'The email, password and demo flag of the demo user cannot be changed';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_protect_demo
	BEFORE UPDATE OR DELETE ON users
	FOR EACH ROW
	WHEN (OLD.demo)
	EXECUTE FUNCTION protect_demo_user();
