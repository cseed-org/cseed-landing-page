CREATE TABLE People (
  person_id TEXT PRIMARY KEY NOT NULL,
  uw_email TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  major TEXT,
  grad_year TEXT,
  pronouns TEXT,
  demographics TEXT,
  cs_email TEXT,
  join_date TEXT NOT NULL,
  campus TEXT,
  personal_email TEXT,
  agreed_to_membership_agreement INTEGER NOT NULL DEFAULT 0
    CHECK (agreed_to_membership_agreement IN (0, 1)),
  has_been_cseed_officer INTEGER NOT NULL DEFAULT 0
    CHECK (has_been_cseed_officer IN (0, 1))
);

-- Keep validated, cleaned form answers, including
-- interests, referral sources, and consent, which are not People columns.
CREATE TABLE Membership_submissions (
  submission_id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL UNIQUE REFERENCES People(person_id),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  received_at TEXT NOT NULL
);

CREATE TRIGGER people_email_domains_insert
BEFORE INSERT ON People
WHEN
  (NEW.uw_email IS NOT NULL AND (
    instr(NEW.uw_email, '@') <= 1 OR
    lower(substr(NEW.uw_email, instr(NEW.uw_email, '@'))) != '@uw.edu' OR
    NEW.uw_email GLOB '*[' || char(9, 10, 11, 12, 13, 32) || ']*'
  )) OR
  (NEW.cs_email IS NOT NULL AND (
    instr(NEW.cs_email, '@') <= 1 OR
    lower(substr(NEW.cs_email, instr(NEW.cs_email, '@'))) != '@cs.washington.edu' OR
    NEW.cs_email GLOB '*[' || char(9, 10, 11, 12, 13, 32) || ']*'
  ))
BEGIN
  SELECT RAISE(ABORT, 'Email domain does not match its column');
END;

CREATE TRIGGER people_email_domains_update
BEFORE UPDATE OF uw_email, cs_email ON People
WHEN
  (NEW.uw_email IS NOT NULL AND (
    instr(NEW.uw_email, '@') <= 1 OR
    lower(substr(NEW.uw_email, instr(NEW.uw_email, '@'))) != '@uw.edu' OR
    NEW.uw_email GLOB '*[' || char(9, 10, 11, 12, 13, 32) || ']*'
  )) OR
  (NEW.cs_email IS NOT NULL AND (
    instr(NEW.cs_email, '@') <= 1 OR
    lower(substr(NEW.cs_email, instr(NEW.cs_email, '@'))) != '@cs.washington.edu' OR
    NEW.cs_email GLOB '*[' || char(9, 10, 11, 12, 13, 32) || ']*'
  ))
BEGIN
  SELECT RAISE(ABORT, 'Email domain does not match its column');
END;

-- Submission history for the future graduation follow-up form. Updating the
-- current People.personal_email will be owned by that future workflow.
CREATE TABLE Graduation_email_submissions (
  submission_id TEXT PRIMARY KEY NOT NULL,
  person_id TEXT NOT NULL REFERENCES People(person_id),
  personal_email TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX graduation_email_submissions_person_id
  ON Graduation_email_submissions(person_id);
