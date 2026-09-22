-- Concurrency-safe source for human-readable guest codes (G-0001, G-0002, ...).
-- Application code calls nextval() inside the create transaction, so two admins
-- adding guests at the same moment can never collide.
CREATE SEQUENCE IF NOT EXISTS guest_code_seq START WITH 1 INCREMENT BY 1;
