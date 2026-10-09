from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Aarohan ESG Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database & Storage
    DATABASE_URL: str = "postgresql+psycopg://postgres:SKIT025@localhost:5432/brsr_db"
You are a senior full-stack/security engineer working inside an existing, fully functional BRSR/ESG application.

This is a LIVE WORKING CODEBASE.

Your task is to migrate the application's current RBAC/SoD architecture to a FINAL FIVE-ROLE architecture without breaking, degrading, removing, or accidentally changing any currently working functionality that belongs to the final product.

This is NOT a frontend-only change.

This is NOT a simple rename.

This is a complete backend + frontend + database + authorization + SoD + migration consolidation.

============================================================
                    ABSOLUTE REQUIREMENT
============================================================

After this task, the application must have EXACTLY FIVE active/runtime roles:

1. system_admin
2. group_admin
3. subsidiary_admin
4. bu_admin
5. project_admin

NO OTHER ROLE may remain as an active/runtime role.

The old roles must not merely be hidden.

They must be removed from the executable authorization architecture so that, after migration, it is as if those roles never existed.

However:

DO NOT achieve this by blindly deleting their definitions.

First identify every capability currently associated with them.

Then move the required capabilities into the correct new role.

Then migrate existing data safely.

Then update authorization.

Then update frontend references.

Then remove the obsolete roles.

Then run regression tests.

The most important objective is:

             PRESERVE FUNCTIONALITY
                     +
             SIMPLIFY RBAC
                     +
             REMOVE OLD ROLES
                     +
             PRESERVE SECURITY/SoD


============================================================
                 FINAL ORGANIZATIONAL MODEL
============================================================

The organizational hierarchy is:

System
  ↓
Group
  ↓
Subsidiary
  ↓
Business Unit
  ↓
Project

The five roles correspond to these levels:

SYSTEM
    system_admin

GROUP
    group_admin

SUBSIDIARY
    subsidiary_admin

BUSINESS UNIT
    bu_admin

PROJECT
    project_admin


============================================================
                FINAL ROLE 1: SYSTEM ADMIN
============================================================

ROLE:

system_admin

SCOPE:

Entire platform.

System Admin is the highest-trust role.

System Admin must retain unrestricted access to the complete application.

Capabilities include all currently implemented platform-level capabilities such as:

- Full user management
- Create users
- Read users
- Update users
- Deactivate users
- Delete users where currently supported
- Assign roles
- Change roles
- Organizational hierarchy management
- Group management
- Subsidiary management
- BU management
- Project management
- Full BRSR/ESG data access
- Data collection
- Evidence access
- Submission access
- Submission review
- Submission approval
- Disclosures
- Calculations
- Consolidation
- Reporting
- Data lineage
- Audit information
- Reporting periods
- Governance controls
- AI features
- AI approval features
- System/software management
- Global configuration
- Security/configuration management
- All functionality currently available to the platform's highest administrative role

System Admin must be able to access all functionality required to operate and troubleshoot the platform.

IMPORTANT:

System Admin is the ONLY role that receives System/Software Management capabilities.

Do not accidentally give those platform-level capabilities to Group Admin.


============================================================
          SYSTEM ADMIN → GROUP ADMIN PROTECTION
============================================================

A System Admin may remove/deactivate a Group Admin.

This must be a security-sensitive backend operation.

The operation must require:

1. Current authenticated user is verified as system_admin.
2. Target user is actually group_admin.
3. Mandatory removal reason/cause.
4. System Admin re-enters their own password.
5. Backend verifies that password against the stored password hash.
6. Operation is performed only after successful verification.
7. An audit event is recorded.

Audit information should include, where supported:

- acting user
- target user
- action
- reason
- timestamp
- result/status

NEVER trust the frontend for this authorization.

NEVER accept something like:

isSystemAdmin=true

from the client as proof of authorization.

NEVER store the entered password.

NEVER log the plaintext password.

The backend must enforce this independently of the frontend.


============================================================
                FINAL ROLE 2: GROUP ADMIN
============================================================

ROLE:

group_admin

SCOPE:

Entire Group and all authorized descendants:

Group
 → Subsidiaries
 → Business Units
 → Projects

Group Admin is the consolidation of the required functionality previously associated with:

- Group Admin
- Group ESG Manager

There must NOT be a separate group_esg_manager role after migration.

Group Admin must therefore receive all required Group Admin + Group ESG Manager functionality.

GROUP ADMIN CAPABILITIES:

USER MANAGEMENT

- Create users within permitted scope
- View users
- Update users
- Deactivate users
- Assign subordinate roles
- Manage Subsidiary Admins
- Manage BU Admins
- Manage Project Admins where currently supported
- Manage organizational assignments

ORGANIZATION

- View group
- Manage permitted subsidiaries
- Manage permitted BUs
- Manage permitted projects
- View organizational hierarchy
- View subordinate organizational data

BRSR / ESG

- View submissions
- Review submissions where applicable
- Approve submissions where applicable
- Create/submit permitted ESG data
- Access group ESG data
- Manage group disclosures
- View subsidiary disclosures
- View BU information
- Access evidence
- Access metrics
- Run calculations
- Run consolidation
- Compile BRSR reports
- View reports
- Trace data lineage
- Lock reporting periods where currently supported
- Governance functions

AI

Group Admin must retain the required AI functionality currently provided by the existing Group Admin / Group ESG Manager implementation.

This may include:

- AI data processing
- Evidence analysis
- AI matching
- AI-assisted review
- AI approval workflows
- Other existing group-level AI capabilities

REPORTING

Group Admin must be capable of:

- Viewing reports
- Generating/compiling reports
- Consolidating subordinate data
- Running calculations required for reporting
- Drilling from final report → entity → BU → project → source data/evidence
- Accessing data lineage

CRITICAL BOUNDARY:

Group Admin gets almost the complete operational/ESG functionality of the system.

BUT:

System/Software Management remains System Admin-only.

Do not give Group Admin global software-management/configuration capabilities that are explicitly intended for System Admin.


============================================================
             FINAL ROLE 3: SUBSIDIARY ADMIN
============================================================

ROLE:

subsidiary_admin

SCOPE:

One subsidiary and all authorized descendants.

Subsidiary Admin is the consolidation of the required functionality previously associated with:

- Subsidiary Admin
- Subsidiary ESG Manager

There must NOT be a separate subsidiary_esg_manager role after migration.

CAPABILITIES:

USER MANAGEMENT

- Create users within permitted subsidiary scope
- View users
- Update users
- Deactivate users
- Manage BU Admins
- Manage Project Admin access where currently supported
- Manage organizational assignments within the subsidiary

VISIBILITY

Can access:

- Own subsidiary
- BUs within subsidiary
- Projects within subsidiary
- Relevant users
- Metrics
- Submissions
- Evidence
- Reports
- Data lineage

ESG / BRSR

- View submissions
- Review submissions
- Approve submissions where applicable
- Monitor BU submissions
- Review evidence
- Access subsidiary metrics
- Manage subsidiary disclosures
- View BU disclosures
- Access data lineage
- Access relevant reports
- Monitor ESG performance

DISCLOSURES

Must support subsidiary-level disclosure functionality currently present in the application, including relevant:

- Section A information
- Section B information
- Section C information
- Governance information
- ESG information

REPORTING

- View subsidiary reports
- Trace data to BUs/projects
- Access relevant consolidations
- Review reporting completeness
- Monitor subsidiary ESG performance

BOUNDARY:

Subsidiary Admin must not gain Group-wide administration or System-level software management merely because responsibilities were consolidated.


============================================================
                FINAL ROLE 4: BU ADMIN
============================================================

ROLE:

bu_admin

SCOPE:

One Business Unit and its authorized projects.

BU Admin is the consolidation of:

- BU Admin
- BU ESG Manager
- Required BU review/approval functionality

There must NOT be a separate:

bu_esg_manager

or

bu_reviewer

role after migration.

CAPABILITIES:

USER MANAGEMENT

- Create Project Admin users
- View BU users
- Update users
- Deactivate users
- Assign project access
- Manage project-level access

PROJECT VISIBILITY

- View projects belonging to the BU
- View project metrics
- View project submissions
- View project evidence
- View project forms
- View project status
- View relevant project data

REVIEW / APPROVAL

BU Admin must be capable of:

- Receiving project submissions
- Inspecting submitted data
- Inspecting evidence
- Checking completeness
- Reviewing calculations
- Returning incorrect submissions
- Approving valid submissions
- Monitoring pending submissions
- Managing the BU review queue

ESG

- Enter BU-level ESG information
- Manage BU disclosures
- Run BU calculations
- Monitor ESG metrics
- Review evidence
- Review project submissions
- Approve/return submissions according to workflow

AUDIT / TRACEABILITY

- Access relevant audit logs
- Access submission history
- Access evidence history
- Access approval history
- Access data lineage

CRITICAL PERMISSION REQUIREMENT:

The existing code may currently assign SUBMISSION_APPROVE to bu_reviewer.

That permission must be transferred to bu_admin where appropriate.

Do NOT simply delete SUBMISSION_APPROVE.

The functionality must survive the migration.

Likewise, if CALC_RUN or other BU ESG permissions currently belong to bu_esg_manager, they must be consolidated into bu_admin.


============================================================
              FINAL ROLE 5: PROJECT ADMIN
============================================================

ROLE:

project_admin

SCOPE:

Authorized project/facility.

Project Admin is the consolidation of:

- Project Admin
- Project Data Entry User / Maker functionality

There must NOT be a separate:

project_data_entry_user

maker

or equivalent runtime role after migration.

CAPABILITIES:

PROJECT MANAGEMENT

- Manage project functionality currently available to Project Admin
- Manage project users where currently supported
- Access project-level metrics
- Access project-level reports

DATA ENTRY

Project Admin becomes the complete project-level operational data-entry role.

Must be able to:

- Open data collection forms
- Enter operational data
- Edit permitted draft data
- Save drafts
- Submit data
- Correct returned submissions
- Resubmit corrected submissions

EVIDENCE

Must be able to:

- Upload evidence
- Attach evidence to data fields
- Upload invoices
- Upload bills
- Upload spreadsheets
- Upload supporting documents
- View project evidence
- Replace/update evidence where workflow permits

The current Data Entry + Evidence Vault functionality must continue working.

PROJECT DATA MAY INCLUDE:

- Electricity consumption
- Fuel consumption
- Renewable energy
- Scope 1 data
- Scope 2 data
- Other ESG metrics
- Invoices
- Bills
- Delivery challans
- Logbooks
- Spreadsheets
- Supporting evidence

WORKFLOW:

Project Admin
    ↓
Enter data
    ↓
Attach evidence
    ↓
Validate
    ↓
Submit
    ↓
BU Admin Review
    ↓
Approve / Return
    ↓
Correction / Resubmission if required


============================================================
                    SEGREGATION OF DUTIES
============================================================

CRITICAL:

Removing the old reviewer/maker roles does NOT mean removing SoD.

Do not preserve SoD by keeping hidden obsolete roles.

Instead, where required, enforce SoD using:

- authenticated user identity
- creator_id
- reviewer_id
- approver_id
- submission ownership
- workflow state
- approval history
- timestamps
- audit history

For example:

creator_id != reviewer_id

where the workflow requires independent review.

A Project Admin who creates a submission must NOT automatically be able to approve that same submission merely because Project Admin now combines the old project roles.

Likewise, BU Admin must not bypass required review controls merely because BU Admin now contains the former review capability.

The principle is:

ROLE CONSOLIDATION DOES NOT MEAN SECURITY-CONTROL REMOVAL.

Preserve legitimate four-eyes / maker-checker controls using identity and workflow state instead of obsolete role identities.


============================================================
            COMPLETE BRSR REPORT PIPELINE
============================================================

The final five-role architecture must support this complete pipeline:

PROJECT ADMIN
    ↓
Raw operational data
    ↓
Evidence attachment
    ↓
Validation
    ↓
Submission
    ↓
BU ADMIN
    ↓
Review
    ↓
Evidence verification
    ↓
Calculation
    ↓
Approve / Return
    ↓
SUBSIDIARY ADMIN
    ↓
Subsidiary ESG information
    ↓
Subsidiary disclosures
    ↓
Governance/context
    ↓
GROUP ADMIN
    ↓
Group disclosures
    ↓
Consolidation
    ↓
Calculations
    ↓
Data lineage
    ↓
BRSR compilation
    ↓
FINAL BRSR REPORT

SYSTEM ADMIN
    ↓
Has unrestricted platform oversight and can access the complete system.

The application must NOT require any legacy role to complete this pipeline.


============================================================
              OLD ROLES TO ELIMINATE
============================================================

The following roles must be permanently removed from the runtime architecture:

group_esg_manager
subsidiary_esg_manager
bu_esg_manager
bu_reviewer
project_data_entry_user
auditor
read_only_viewer

Also permanently remove legacy aliases:

super_admin
esg_manager
maker
checker
viewer

Do NOT merely hide them.

Do NOT leave them as compatibility aliases.

Do NOT leave them in runtime ROLE_PERMISSIONS.

Do NOT leave them in authorization decorators.

Do NOT leave them in role enums.

Do NOT leave them in frontend role guards.

Do NOT leave them in role-selection UI.

Do NOT allow them to be assigned.

Do NOT allow authentication using them.

Do NOT leave conditions such as:

role in ["bu_admin", "bu_esg_manager"]

after migration.

The final runtime architecture must recognize only:

system_admin
group_admin
subsidiary_admin
bu_admin
project_admin


============================================================
              CRITICAL MIGRATION STRATEGY
============================================================

DO NOT START BY DELETING THE OLD ROLES.

First perform a COMPLETE DEPENDENCY AUDIT.

Search the entire repository for every occurrence of:

system_admin
group_admin
group_esg_manager
subsidiary_admin
subsidiary_esg_manager
bu_admin
bu_esg_manager
bu_reviewer
project_admin
project_data_entry_user
auditor
read_only_viewer
super_admin
esg_manager
maker
checker
viewer

Also search for indirect role logic such as:

ROLE_PERMISSIONS
ROLE_HIERARCHY
ROLE_ALIASES
role enums
permission maps
allowed_roles
require_role
has_role
is_admin
is_reviewer
is_maker
is_checker
role == ...
role in [...]
current_user.role
user.role
JWT role claims
route guards
middleware
dependency functions
authorization decorators
service-level authorization
database constraints
seed data
fixtures
factories
tests
frontend conditional rendering
frontend route guards
API permission checks
SoD rules
workflow checks
audit logic


============================================================
              PERMISSION AUDIT BEFORE CHANGES
============================================================

Before changing RBAC, produce an internal capability map.

For every obsolete role, determine:

1. What permissions does it currently have?
2. What endpoints depend on it?
3. What frontend features depend on it?
4. What services depend on it?
5. What SoD rules depend on it?
6. What database records depend on it?
7. Which final role should inherit each required capability?
8. Is the capability still required by the final product?

DO NOT assume that deleting a role means deleting its permissions.

Example:

If current code has:

group_esg_manager:
    CONSOLIDATION_RUN
    CALC_RUN
    REPORT_COMPILE

then these required capabilities must move to:

group_admin

Similarly, if:

bu_reviewer:
    SUBMISSION_APPROVE

then the required approval capability must move to:

bu_admin

The capability must survive.

The obsolete role must not.


============================================================
                    DATABASE MIGRATION
============================================================

Inspect the database before changing role definitions.

Check:

- user role columns
- enums
- constraints
- role tables
- foreign keys
- seed users
- fixtures
- existing user records
- authentication records
- migration history
- JWT/session role storage

If existing users use obsolete roles, migrate them safely according to the final architecture where there is a clearly defined equivalent.

Primary consolidation mapping:

group_esg_manager
    → group_admin

subsidiary_esg_manager
    → subsidiary_admin

bu_esg_manager
    → bu_admin

project_data_entry_user
    → project_admin

super_admin
    → system_admin

esg_manager
    → group_admin

maker
    → project_admin

checker
    → bu_admin

viewer
    → REMOVE / REQUIRE EXPLICIT MIGRATION DECISION

For:

auditor
read_only_viewer
bu_reviewer

do NOT randomly assign users to another role.

First inspect whether real persisted users exist and whether their functionality is required by the final product.

The final architecture has no Auditor or Read-Only role.

If actual records exist, handle their migration deliberately rather than silently granting excessive permissions.


============================================================
                  NO PERMANENT ALIASES
============================================================

The migration may temporarily use migration logic where necessary.

But the FINAL runtime code must NOT contain:

"maker": "project_data_entry_user"

or:

"checker": "bu_reviewer"

or:

"esg_manager": "group_esg_manager"

or any equivalent compatibility alias.

After migration:

Those role identifiers must not participate in runtime authorization.

The final system must have only five runtime roles.


============================================================
                    FRONTEND
============================================================

The current frontend is already considered the desired product direction.

DO NOT redesign the frontend.

DO NOT change its visual design unnecessarily.

Do not change working workflows unnecessarily.

Update only what is required to make the frontend use the final five-role architecture.

The frontend role model must expose only:

- System Admin
- Group Admin
- Subsidiary Admin
- BU Admin
- Project Admin

Remove obsolete role options.

Remove obsolete role-specific UI branches.

Update role-based navigation/feature visibility.

But remember:

FRONTEND HIDING IS NOT SECURITY.

Every protected backend endpoint must independently enforce the new five-role model.


============================================================
                PRESERVE CURRENT SOFTWARE
============================================================

This is the most important engineering constraint.

The existing software is currently functional and satisfies the required frontend/product behavior.

DO NOT redesign or refactor unrelated systems.

Do not modify unrelated:

- BRSR mappings
- ESG calculations
- AI engines
- AI service integrations
- evidence processing
- Evidence Vault
- data-entry forms
- dashboard calculations
- reporting logic
- disclosure logic
- document processing
- storage systems
- database structures unrelated to RBAC
- API contracts
- frontend layouts
- styling
- business rules

unless directly required for the RBAC migration.

If something currently works, preserve it.

If a permission currently comes from an old role but the feature is required, move the permission.

Do NOT remove the feature.


============================================================
                 CHANGE SAFETY REQUIREMENT
============================================================

Before modifying the code:

1. Inspect the repository structure.
2. Inspect RBAC implementation.
3. Inspect SoD implementation.
4. Inspect authentication.
5. Inspect authorization dependencies.
6. Inspect database role representation.
7. Inspect frontend role handling.
8. Inspect tests.
9. Inspect existing migrations.
10. Build a dependency/capability map.

If the project uses Git and the environment permits it:

Create or verify a safe checkpoint before making destructive changes.

Do NOT make destructive changes until the dependency audit is complete.


============================================================
                 IMPLEMENTATION ORDER
============================================================

Use this order:

PHASE 1
Audit existing RBAC/SoD and all dependencies.

PHASE 2
Build a mapping of old capability → final role.

PHASE 3
Update permission definitions so required functionality belongs to the final five roles.

PHASE 4
Update backend authorization checks.

PHASE 5
Update SoD/workflow checks to use user identity/workflow state where necessary.

PHASE 6
Create safe database migrations for persisted role values.

PHASE 7
Migrate existing users/records where a deterministic mapping exists.

PHASE 8
Update authentication/JWT/session role handling.

PHASE 9
Update frontend role references and guards.

PHASE 10
Remove obsolete runtime role definitions.

PHASE 11
Remove obsolete aliases and dead authorization branches.

PHASE 12
Run repository-wide search for obsolete runtime identifiers.

PHASE 13
Run backend tests.

PHASE 14
Run frontend tests/build.

PHASE 15
Run critical end-to-end workflows.

PHASE 16
Only then declare the migration complete.


============================================================
                    REGRESSION TESTING
============================================================

Before declaring success, verify:

SYSTEM ADMIN

- Can log in.
- Can access all intended functionality.
- Can manage users.
- Can manage hierarchy.
- Can access all BRSR features.
- Can access AI.
- Can access reporting.
- Can access consolidation.
- Can manage system/software configuration.
- Can remove Group Admin only with reason + password verification.

GROUP ADMIN

- Can log in.
- Can access group functionality.
- Can access former Group ESG functionality.
- Can run calculations.
- Can run consolidation.
- Can compile BRSR.
- Can access reporting.
- Can access lineage.
- Can access required AI.
- Cannot access System Admin-only software management.

SUBSIDIARY ADMIN

- Can log in.
- Can manage subsidiary functionality.
- Can access former Subsidiary ESG functionality.
- Can manage subsidiary disclosures.
- Can monitor BU submissions.
- Can access evidence.
- Can access reports and lineage.

BU ADMIN

- Can log in.
- Can manage BU functionality.
- Can access former BU ESG functionality.
- Can review submissions.
- Can inspect evidence.
- Can approve/return submissions.
- Can run BU calculations.
- Can manage BU disclosures.
- Can access review queue.
- SoD remains enforced.

PROJECT ADMIN

- Can log in.
- Can access project functionality.
- Can open data-entry forms.
- Can enter data.
- Can save drafts.
- Can attach evidence.
- Can upload documents/spreadsheets.
- Can submit.
- Can receive returned submissions.
- Can correct and resubmit.
- Cannot gain unrestricted organization-wide visibility.

CRITICAL END-TO-END TEST:

Create test data:

Project Admin
    ↓
Enter BRSR data
    ↓
Attach evidence
    ↓
Submit
    ↓
BU Admin
    ↓
Review
    ↓
Approve
    ↓
Subsidiary Admin
    ↓
Add subsidiary disclosures/context
    ↓
Group Admin
    ↓
Consolidate
    ↓
Compile BRSR
    ↓
Generate final report

This complete workflow must work using ONLY the five final roles.


============================================================
              OBSOLETE ROLE VERIFICATION
============================================================

After implementation, perform a repository-wide search again.

Search for:

group_esg_manager
subsidiary_esg_manager
bu_esg_manager
bu_reviewer
project_data_entry_user
auditor
read_only_viewer
super_admin
esg_manager
maker
checker
viewer

Every remaining occurrence must be classified.

The following may remain only where technically unavoidable and non-runtime, such as immutable historical migration records or documentation describing a migration.

There must be NO active executable authorization logic depending on them.

There must be:

NO obsolete runtime role
NO obsolete role permission
NO obsolete role alias
NO obsolete frontend role guard
NO obsolete role assignment
NO obsolete authentication path
NO obsolete role-based API authorization


============================================================
              DO NOT INVENT NEW ROLES
============================================================

Do not solve an authorization problem by creating another role.

The final architecture is strictly:

system_admin
group_admin
subsidiary_admin
bu_admin
project_admin

If a workflow requires separation, use:

- user identity
- ownership
- workflow state
- approval history
- organizational scope
- permission/capability checks

rather than introducing another role.


============================================================
             IF YOU FIND AN AMBIGUITY
============================================================

Do NOT guess if an authorization dependency is ambiguous.

Before making a potentially destructive decision, report:

1. File
2. Function/class
3. Current behavior
4. Old role involved
5. Capability involved
6. Proposed new role
7. Why the mapping is appropriate
8. Regression risk
9. Proposed migration

Do not silently remove a capability.

Do not silently grant excessive permissions.

Do not silently migrate ambiguous users.


============================================================
                 FINAL ACCEPTANCE CRITERIA
============================================================

The migration is COMPLETE only when:

[ ] Exactly five runtime roles exist.

[ ] system_admin exists.

[ ] group_admin exists.

[ ] subsidiary_admin exists.

[ ] bu_admin exists.

[ ] project_admin exists.

[ ] Group Admin contains required Group ESG functionality.

[ ] Subsidiary Admin contains required Subsidiary ESG functionality.

[ ] BU Admin contains required BU ESG functionality.

[ ] BU Admin contains required submission review/approval functionality.

[ ] Project Admin contains complete Project Admin functionality.

[ ] Project Admin contains complete project data-entry functionality.

[ ] Evidence upload functionality continues working.

[ ] Submission workflow continues working.

[ ] Review workflow continues working.

[ ] Approval workflow continues working.

[ ] SoD remains enforced.

[ ] Group Admin can run required calculations.

[ ] Group Admin can run consolidation.

[ ] Group Admin can compile the BRSR report.

[ ] Complete BRSR generation works using only the five final roles.

[ ] System Admin retains unrestricted access.

[ ] System Admin retains software/platform management.

[ ] Group Admin does NOT receive System Admin-only software management.

[ ] System Admin → Group Admin removal requires reason + password verification.

[ ] Removal is enforced by backend.

[ ] Removal is audited.

[ ] Existing users are safely migrated where deterministic mapping exists.

[ ] Database role constraints are consistent.

[ ] Authentication supports only final runtime roles.

[ ] JWT/session role handling supports only final runtime roles.

[ ] Backend authorization supports only final runtime roles.

[ ] Frontend role handling supports only final runtime roles.

[ ] Obsolete roles cannot be assigned.

[ ] Obsolete roles cannot authenticate.

[ ] Obsolete roles cannot appear in frontend role selection.

[ ] Obsolete roles are not used in runtime authorization.

[ ] Obsolete aliases are removed.

[ ] Existing working features continue to function.

[ ] Backend starts successfully.

[ ] Database migrations succeed.

[ ] Frontend builds successfully.

[ ] Existing tests pass.

[ ] New RBAC regression tests pass.

[ ] Critical end-to-end BRSR workflow passes.

[ ] Final repository search confirms obsolete roles are no longer part of executable architecture.


============================================================
                    FINAL PRINCIPLE
============================================================

Do not think:

"Delete the old roles."

Think:

"Extract every required capability from the old architecture, move it into the correct one of five final roles, preserve every required workflow and security control, migrate existing data safely, then permanently remove the obsolete roles from the runtime architecture."

The desired final state is:

                    SYSTEM ADMIN
                         │
                         ▼
                    GROUP ADMIN
                         │
                         ▼
                 SUBSIDIARY ADMIN
                         │
                         ▼
                     BU ADMIN
                         │
                         ▼
                   PROJECT ADMIN

Exactly five runtime roles.

No hidden Maker.
No hidden Checker.
No hidden ESG Manager.
No hidden Reviewer.
No hidden Auditor.
No hidden Viewer.
No legacy runtime aliases.

The application must remain fully functional and capable of completing the entire BRSR lifecycle and generating the final BRSR report using only these five roles.

Do not claim completion based only on the frontend.

Verify backend authorization, database state, authentication, SoD, permissions, migrations, frontend guards, tests, and the complete BRSR workflow.    REDIS_URL: str = "redis://localhost:6379/0"
    
    # MinIO / S3 Storage
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "aarohan-evidence-vault"
    S3_REGION: str = "us-east-1"

    # Security & Auth
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI Gateway Settings
    AI_PROVIDER: str = "openrouter"  # "gemini", "openrouter", "mock"
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL_TEXT: str = "meta-llama/llama-3.1-8b-instruct"
    OPENROUTER_MODEL_VISION: str = "google/gemini-1.5-flash"
    AI_FALLBACK_TO_MOCK: bool = True
    AI_AUTO_FALLBACK_ON_ERROR: bool = True
    AI_MODEL_VISION: str = "models/gemini-3.8-flash"
    AI_MODEL_TEXT: str = "models/gemini-3.8-flash"
    AI_EMBEDDING_MODEL: str = "models/text-embedding-004"

settings = Settings()
