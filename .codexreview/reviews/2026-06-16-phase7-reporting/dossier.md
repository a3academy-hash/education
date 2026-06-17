# Dossier — Phase 7 Reporting+Compliance plan
Repo a3_education, branch overhaul/v0.2. Binding new_plan/SECURITY_DB_REPORTING.md (v0.2).
Compliance SCHEMA spine already built (migrations 0001-0006, GENERATED-not-executed): families/
guardians(role enum, court_order_flag, dual_consent)/students(dob,age_band,compliance_path), consents
(immutable), data_classes+retention_policies(seeded §3, attorney_pending), append-only attempts/
mastery_updates, assert_can_access_student / nonce+HMAC submit_attempt / erase_student_operational_data
RPCs, can_read_raw_evidence (coach exclusion). Pure builders exist: lib/insight/{roster,flags,
decision-timeline}, lib/transcript (CCSS weakest-link roll-up + creditBearing HS-category logic). App:
app/parent (roster only, no mastery data), app/admin/students (roster+flags+timeline). Memory repo for
dev/test (no SQL execution). Phase 5 visual system done (Chrome, ProgressRing/MasteryRing, StatusPill).
GOAL gate: under-13 consent-gated; parent/admin/coach views work; export generates; NCAA + 70/20/10;
n≥5. GOAL non-negotiable #6: compliance is LAUNCH-gated, not build-gated (build/test freely vs test data).
Attack: what in this app-layer MVD breaks SECURITY conformance, the n≥5 inference channel, the
server-side-grading rule, FERPA posture, or honestly distinguishing locked vs provisional/credited
mastery. Name the single thing most likely fatally wrong.
