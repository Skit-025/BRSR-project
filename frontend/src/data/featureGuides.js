/**
 * AAROHAN ESG Platform — Comprehensive Feature Guides & Statutory User Manual
 * Structured specifically for SEBI BRSR Core & Comprehensive Compliance.
 *
 * Each feature entry provides:
 * 1. What is it? (Clear definition and key capabilities)
 * 2. Why is it necessary? (Regulatory mandate & governance rationale)
 * 3. What it contributes to the final BRSR report (Section, Principles 1-9, Core KPIs)
 * 4. How should it be used with respect to roles (Maker, Checker, Corporate, Auditor)
 * 5. Step-by-step User Manual (Actionable instructions, Pro-Tips, and Common Pitfalls)
 */

export const FEATURE_GUIDES = {
  '/collection': {
    id: 'data-entry',
    route: '/collection',
    title: 'Data Entry & Operational Measurement',
    subtitle: 'Primary quantitative data collection with automated unit normalization',
    badge: 'Maker Gateway',
    color: '#059669',
    sebiSection: 'Section C — Principle-wise Performance (Principles 1–9)',
    indicators: ['ENV-ENERGY-001 (Electricity/Fuel)', 'ENV-GHG-001/2 (Emissions)', 'ENV-WATER-001 (Water Intake)', 'SOC-SAFE-001 (LTIFR)'],
    whatIsIt: `The Data Entry module is the primary operational gateway where project site engineers and operational data owners record monthly physical ESG activity measurements across energy, fuel, water, waste, safety, and community metrics. Every data point is normalized into statutory base units (e.g. converting Litres/Gallons of diesel to GigaJoules, or kWh to MWh) and linked directly to evidentiary vouchers.`,
    whyNecessary: `Under SEBI LODR Regulation 34(2)(f) and the BRSR Core mandate, ESG disclosures must be corroborated by immutable primary records. Estimates and unsubstantiated entries without audit trails fail Reasonable Assurance. Direct digital entry at the operational source eliminates spreadsheet version chaos, transcription errors, and ensures full chain of custody.`,
    brsrContribution: `Directly populates all quantitative indicator tables in Section C (Principles 1 through 9). For example, diesel and grid electricity logged here directly compute Principle 6 Essential Indicators (Total Energy Consumption, Scope 1 GHG emissions, Scope 2 emissions), and man-hours/injuries compute Principle 3 Essential Indicators (LTIFR, Lost Time Incidents).`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer (Maker)',
        badge: 'Maker',
        color: '#059669',
        action: 'Select your operational project and active month. Enter meter readings, fuel receipts, or utility ledger amounts. Always attach supporting PDF bills or weight-slips in the Evidence attachment slot. Verify converted base units before clicking "Submit for Review".'
      },
      {
        role: 'BU Admin / Department Head (Checker)',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Review submitted monthly figures against historical baselines and attached evidence bills. Do not approve submissions where evidence is missing or values deviate significantly without a documented justification.'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Monitor submission timeliness across all operating sites and business units. Lock reporting periods once monthly submission deadlines pass to preserve data immutability.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Verify that entered figures match the primary attached invoices. Check timestamps to verify that data entry occurred contemporaneously with operational activity.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Select Facility & Period',
          desc: 'Select the operational project/site and the active financial period (e.g., FY 2025–26, current month) from the top filters.'
        },
        {
          num: '2',
          title: 'Enter Operational Figures',
          desc: 'Locate the relevant indicator card (e.g., Grid Electricity Consumption or HSD Diesel Fuel). Type the meter reading or billed quantity.'
        },
        {
          num: '3',
          title: 'Confirm Measurement Units',
          desc: 'Select the unit of measurement used in your bill (e.g., kWh, MWh, Litres, MT). The system automatically computes the statutory base unit value in real time.'
        },
        {
          num: '4',
          title: 'Attach Primary Evidence',
          desc: 'Click "Attach Bill / Voucher" to link a verified PDF/image from the Evidence Vault or upload a new file. Ensure the invoice date and billed volume match your entry.'
        },
        {
          num: '5',
          title: 'Save Draft or Submit',
          desc: 'Click "Save Draft" to persist your edits safely without freezing them, or click "Submit Submission Pack" once all required metrics are filled to hand over to the BU Checker.'
        }
      ],
      proTips: [
        'Utilize the built-in AI Bill OCR button to pre-fill invoice numbers, amounts, and dates directly from utility bills.',
        'Data cannot be edited after submission. Double-check all figures before submitting.'
      ],
      pitfalls: [
        'Submitting negative numbers or zero consumption for active construction sites will trigger a validation blocker.',
        'Failing to attach a bill to mandatory indicators will prevent pack submission.'
      ]
    }
  },

  '/evidence': {
    id: 'evidence-vault',
    route: '/evidence',
    title: 'Evidence Vault & Cryptographic Archive',
    subtitle: 'Tamper-evident primary document storage substantiated with SHA-256 digital proofs',
    badge: 'Assurance Foundation',
    color: '#0284C7',
    sebiSection: 'Reasonable Assurance Verification Pack & Audit Dossiers',
    indicators: ['Electricity Bills', 'Fuel Delivery Challans', 'Weighbridge Slips', 'PPA Agreements', 'ETP Water Test Reports'],
    whatIsIt: `The Evidence Vault is the secure, immutable document repository where all primary statutory artifacts (utility electricity invoices, fuel delivery challans, weighbridge receipts, calibration certificates, waste manifests, and renewable PPA contracts) are ingested, classified, cryptographically fingerprinted, and linked to reported figures.`,
    whyNecessary: `Under the SEBI BRSR Core assurance guidelines, assurance providers must follow an independent verification trail down to primary third-party vouchers. If an indicator cannot be traced to a verifiable bill or meter log, it receives an audit qualification. The Evidence Vault guarantees tamper-evidence by computing a SHA-256 hash immediately upon file receipt.`,
    brsrContribution: `Substantiates every single disclosed figure across the entire BRSR report. When the corporate report is submitted to SEBI or reviewed by external assurance providers (e.g. Big 4), the Evidence Vault generates the downloadable "Audit Workpaper Pack" linking every disclosed metric directly to its source files.`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer (Maker)',
        badge: 'Maker',
        color: '#059669',
        action: 'Upload scans or digital PDFs of utility invoices, fuel delivery receipts, and meter records promptly as they are issued. Tag them with the appropriate Project Name and Document Category (e.g. Electricity Bill, Fuel Bill).'
      },
      {
        role: 'BU Admin / Reviewer (Checker)',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Examine uploaded evidence documents before approving data packs. Ensure bill dates correspond to the active period and customer names match the corporate entity.'
      },
      {
        role: 'Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Review overall evidence coverage across all operational sites. Identify facilities with missing evidence before annual external assurance starts.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Click any document preview to inspect original invoices. Verify the SHA-256 cryptographic hash to ensure the voucher has not been altered or replaced since upload.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Click Upload Evidence',
          desc: 'Press the "+ Upload Evidence" button in the top action bar to open the secure document uploader modal.'
        },
        {
          num: '2',
          title: 'Select File & Category',
          desc: 'Drag and drop your file (PDF, PNG, JPG). Choose the Document Category (e.g., Electricity Bill, Fuel Bill, Weighbridge Slip, Lab Test Report).'
        },
        {
          num: '3',
          title: 'Assign Project & Metric',
          desc: 'Select the operational project/site and the target ESG metric indicator (e.g. ENV-ENERGY-001) that this document substantiates.'
        },
        {
          num: '4',
          title: 'Review SHA-256 Proof',
          desc: 'The vault computes and displays the unique 64-character SHA-256 cryptographic digest, ensuring non-repudiation.'
        },
        {
          num: '5',
          title: 'Preview & Link',
          desc: 'Use the built-in document viewer to inspect uploaded pages, verify billing totals, and confirm attachment status.'
        }
      ],
      proTips: [
        'Always upload original utility PDF downloads rather than low-resolution mobile photos whenever possible for higher OCR accuracy.',
        'Use the search bar to filter by unique Document ID (e.g., EVD-XXXXXXXX) or file name.'
      ],
      pitfalls: [
        'Deleting an evidence document that is currently linked to an approved data pack is strictly blocked to maintain audit integrity.',
        'Uploading duplicate bills across different periods will trigger a duplication alert in the Data Quality desk.'
      ]
    }
  },

  '/data-quality': {
    id: 'data-quality',
    route: '/data-quality',
    title: 'Data Quality & Exceptions Desk',
    subtitle: 'Automated anomaly detection, business rule validation, and formal exception tracking',
    badge: 'Pre-Audit Defense',
    color: '#D97706',
    sebiSection: 'Internal Controls & Data Integrity Assurance (Section B & C)',
    indicators: ['Missing Mandatory Evidence', 'Negative Consumption Rule', 'Unit Slip Outliers (>1000x)', 'Year-over-Year Spikes (>35%)'],
    whatIsIt: `The Data Quality Desk is the central ESG quality assurance console that continuously scans all submitted operational data against business rules, statistical limits, and AI anomaly engines. It flags missing mandatory vouchers, impossible negative values, unit slip errors (e.g., entering Litres in place of kL), and uncharacteristic spikes.`,
    whyNecessary: `Regulators and institutional investors scrutinize year-over-year swings and anomalous intensity figures. Submitting faulty or unverified figures leads to SEBI clarification notices or assurance qualifications. The Data Quality desk ensures errors are caught and justified internally before data enters the corporate calculation pipeline.`,
    brsrContribution: `Guarantees the mathematical and physical accuracy of all Section C disclosures. Exceptions resolved and logged here with written management justifications serve as the official defense trail during Reasonable Assurance inquiries.`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer (Maker)',
        badge: 'Maker',
        color: '#059669',
        action: 'Review warnings flagged on your facility. If an anomaly is genuine (e.g., site grid shut down requiring emergency diesel generators), submit a detailed written justification explaining the operational cause.'
      },
      {
        role: 'BU Admin / Reviewer (Checker)',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Inspect flagged warnings before approving submissions. Evaluate site engineers’ justifications and either accept them, request amendments, or reject the submission pack.'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Monitor open exception counts across all business units. Ensure zero unresolved Critical Errors remain prior to triggering final group consolidation.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Examine the exception log to review which data points deviated from historical baselines and verify management’s written explanations and corroborating evidence.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Review Quality Health Card',
          desc: 'Examine the top metric summary cards displaying Total Audited Submissions, Critical Errors, Warnings, and Resolved Exceptions.'
        },
        {
          num: '2',
          title: 'Filter by Entity & Severity',
          desc: 'Filter results by Business Unit, Operating Site, or Severity (Error vs. Warning) to triage high-priority items.'
        },
        {
          num: '3',
          title: 'Inspect Anomaly Details',
          desc: 'Click on any flagged exception row to view the metric code, entered value, historical baseline, and specific rule triggered (e.g. RULE-ANOM-E2).'
        },
        {
          num: '4',
          title: 'Submit Justification',
          desc: 'For legitimate operational spikes, click "Provide Justification", enter clear operational context (e.g. "Turbine commissioning phase during August"), and submit.'
        },
        {
          num: '5',
          title: 'Resolve or Re-measure',
          desc: 'If an error was a clerical mistake (e.g., extra zero added), instruct the site engineer to recall the submission, correct the reading, and re-submit.'
        }
      ],
      proTips: [
        'A single justified anomaly will not block your submission; only unacknowledged warnings and critical errors halt progress.',
        'Use the "Run Validation Engine" button to re-scan submissions after updating records.'
      ],
      pitfalls: [
        'Writing generic justifications like "Okay" or "N/A" will be rejected by BU Checkers and external verifiers.',
        'Never ignore Critical Errors: the system will strictly prevent final BRSR report compilation until critical errors are resolved.'
      ]
    }
  },

  '/workflow': {
    id: 'workflow-desk',
    route: '/workflow',
    title: 'Review & Approvals Desk (Segregation of Duties)',
    subtitle: 'Four-eyes verification gate enforcing strict separation between data preparers and approvers',
    badge: 'Governance Gate',
    color: '#2563EB',
    sebiSection: 'Section B — Management & Process Disclosures (Governance & Oversight)',
    indicators: ['Four-Eyes Segregation of Duties', 'Maker-Checker Approval Hierarchy', 'Period Freeze & Immutability', 'Return with Remarks'],
    whatIsIt: `The Workflow Desk is the administrative governance gate enforcing Maker-Checker separation (Four-Eyes Principle). Data entered by Project Site Engineers (Makers) must be systematically reviewed, verified, and approved by Business Unit Heads and Corporate ESG Leads (Checkers) before figures are locked and admitted into the statutory consolidation pipeline.`,
    whyNecessary: `A core requirement of SEBI BRSR Core and international audit standards (ISAE 3000 / SSAE 3410) is internal governance controls that prevent single-user manipulation of reported ESG metrics. Self-approval is strictly blocked by system logic, guaranteeing an independent verification layer.`,
    brsrContribution: `Directly satisfies Section B (Management and Process Disclosures) Question 1-4 regarding internal review mechanisms and governance oversight. Only data packs with approved workflow status are rolled up into the final statutory report tables.`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer (Maker)',
        badge: 'Maker',
        color: '#059669',
        action: 'Track the real-time status of your submitted data packs (Submitted, In Review, Approved, Returned). If a pack is returned by your BU Checker, read the rejection notes, amend the figures, and re-submit.'
      },
      {
        role: 'BU Admin / Department Head (Checker)',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Review pending submission packs for your Business Unit. Inspect entered values, compare against attached bills, verify quality desk flags, and click "Approve" or "Return with Remarks".'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Execute subsidiary-level and group-level sign-offs. Lock approved periods to render the entire corporate reporting period permanently immutable.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Review the chronological timeline of approvals, checking the timestamps and identities of the Maker vs. Checker to confirm complete Segregation of Duties compliance.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Access Pending Queue',
          desc: 'Open the Workflow Review Desk and inspect the list of packs awaiting review for your assigned projects or BUs.'
        },
        {
          num: '2',
          title: 'Drill Down into Submission',
          desc: 'Click "Review Pack" to inspect line-by-line metrics, normalized base units, attached vouchers, and quality engine sanity scores.'
        },
        {
          num: '3',
          title: 'Inspect Audit Lineage',
          desc: 'Open the "Lineage & Evidence" tab to verify the exact invoice attached to each claimed metric figure.'
        },
        {
          num: '4',
          title: 'Enforce Segregation of Duties',
          desc: 'The system validates that your user ID is distinct from the Maker user ID who submitted the pack. Self-approval is automatically disabled.'
        },
        {
          num: '5',
          title: 'Approve or Return',
          desc: 'If satisfied, click "Approve Submission". If figures are questionable or vouchers are missing, click "Return to Maker", type a clear required action, and submit.'
        }
      ],
      proTips: [
        'Use the "Bulk Review Summary" to see total energy and water at a glance across an entire BU before individual approvals.',
        'Returned submissions unlock editing for the site engineer while preserving the previous version history.'
      ],
      pitfalls: [
        'Attempting to approve a pack you authored will produce an HTTP 403 Forbidden Segregation-of-Duties block.',
        'Approving packs with open un-justified errors will propagate data flaws into the consolidation engine.'
      ]
    }
  },

  '/consolidation': {
    id: 'consolidation-engine',
    route: '/consolidation',
    title: 'Calculation & Consolidation Pipeline',
    subtitle: 'Bottom-up organizational boundary rollup with dynamic equity-share and operational-control math',
    badge: 'Consolidation Engine',
    color: '#7C3AED',
    sebiSection: 'Consolidated Group Disclosures across Principles 1–9',
    indicators: ['Scope 1 Direct GHG', 'Scope 2 Location & Market GHG', 'Total Operational Energy (GJ)', 'Water Intensity & Turnover Ratios'],
    whatIsIt: `The Calculation & Consolidation Pipeline is the high-performance computation engine that aggregates operational metrics bottom-up through the corporate hierarchy: Project $\\to$ Business Unit $\\to$ Subsidiary $\\to$ Group. It applies statutory greenhouse gas emission factors, boundary ownership percentages (100% operational control vs. equity share JVs), and recomputes intensity ratios from raw sums rather than averaging percentages.`,
    whyNecessary: `A common failure point in manual sustainability reporting is "averaging averages" (e.g. averaging energy intensities across sites of different sizes) and misapplying Joint Venture equity percentages. The consolidation engine executes boundary math deterministically and stores child contribution lineages for drill-down.`,
    brsrContribution: `Produces the corporate totals that appear in Section C disclosure tables and executive BRSR Core KPIs: Total Scope 1 Emissions (tCO₂e), Total Scope 2 Emissions (tCO₂e), Total Energy Consumption (GJ), and statutory Energy/Water Intensity per Rupee of Turnover.`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer (Maker)',
        badge: 'Maker',
        color: '#059669',
        action: 'Read-only access. Site engineers can view how their project numbers contribute to the higher BU total in the contribution breakdown tab.'
      },
      {
        role: 'BU Admin / Department Head (Checker)',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Run consolidation for your specific Business Unit to review rolled-up operational totals across all your active projects and overhead offices.'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Trigger the enterprise-wide Consolidation Run for the financial period. Inspect the final corporate totals, verify joint venture boundary weightings, and lock the consolidated snapshot.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Audit the mathematical formulas and factor registries. Click any consolidated KPI to open the Child Contribution Lineage drawer and trace the number down to individual subsidiary and project components.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Select Period & Target Node',
          desc: 'Choose the reporting period (e.g. FY 2025–26) and select the organizational level (Group, Subsidiary, or BU) you want to calculate.'
        },
        {
          num: '2',
          title: 'Review Emission Factor Registry',
          desc: 'Verify that statutory emission factors (CEA Grid CO₂ factors, IPCC stationary combustion factors) are active for the reporting year.'
        },
        {
          num: '3',
          title: 'Click Run Consolidation',
          desc: 'Press the "Run Consolidation Engine" button. The system traverses all child nodes in reverse topological order (bottom-up).'
        },
        {
          num: '4',
          title: 'Inspect Consolidated Results',
          desc: 'View aggregated figures across Energy, GHG Scope 1, Scope 2, Water, and Waste with color-coded confidence metrics.'
        },
        {
          num: '5',
          title: 'Drill Down into Lineage',
          desc: 'Click on any consolidated row (e.g. Scope 1 18,650 tCO₂e) to open the child contribution drawer showing each facility’s exact weighted share.'
        }
      ],
      proTips: [
        'Consolidation only includes approved or locked submissions; draft submissions are intentionally excluded to protect data integrity.',
        'Intensity metrics automatically re-divide aggregate energy/emissions by corporate turnover to guarantee mathematical validity.'
      ],
      pitfalls: [
        'Running consolidation before all key project packs are approved will produce incomplete corporate totals.',
        'Do not override consolidated values manually unless accompanied by an executive override note and password confirmation.'
      ]
    }
  },

  '/reporting': {
    id: 'brsr-reporting',
    route: '/reporting',
    title: 'BRSR Disclosures & Statutory Reporting',
    subtitle: 'Final synthesis of quantitative results and corporate disclosures into official SEBI formats',
    badge: 'Statutory Deliverable',
    color: '#4F46E5',
    sebiSection: 'Complete SEBI BRSR & BRSR Core Filing (Sections A, B, and C)',
    indicators: ['Complete BRSR Full Format', 'BRSR Core (9 Mandatory Attributes)', 'PDF Statutory Filing Report', 'Excel XBRL-Ready Workbook'],
    whatIsIt: `The BRSR Disclosures & Reporting module is the final publishing engine. It automatically merges quantitative consolidated numbers from the calculation pipeline with corporate disclosures (governance, policies, workforce demographics, CSR, and stakeholder engagement) to generate the complete SEBI BRSR and BRSR Core statutory reports.`,
    whyNecessary: `Listed companies in India (top 1,000 by market capitalization) are legally mandated under SEBI circulars to file the BRSR annual report with stock exchanges (BSE/NSE) and obtain Reasonable Assurance on the BRSR Core attributes. Compiling this manually in Word or Excel takes hundreds of hours and is prone to version errors. This module compiles the entire report in seconds with audit hashes.`,
    brsrContribution: `This IS the final statutory output. It formats and renders: Section A (General Disclosures including corporate identity, products, turnover, workforce), Section B (Management and Process Disclosures including policies, governance, and review), and Section C (Principle 1 through 9 performance).`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer (Maker)',
        badge: 'Maker',
        color: '#059669',
        action: 'Read-only access. Can view the published corporate disclosures and see how their project’s field data is represented in the final report.'
      },
      {
        role: 'BU Admin / Department Head (Checker)',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Review BU-level contribution sections and ensure business-line performance narratives align with commercial operations.'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Compile the official Group report, configure reporting options (BRSR Full vs. BRSR Core), preview PDF/Excel outputs, and lock the final filing version.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Download the compiled BRSR Core report and generate the cryptographic Audit Workpaper Pack to verify every reported figure before issuing the independent assurance statement.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Select Reporting Entity & Period',
          desc: 'Select the legal reporting entity (e.g., Aarohan Infrastructure & Energy Group) and the target financial year.'
        },
        {
          num: '2',
          title: 'Choose Report Format',
          desc: 'Toggle between "BRSR Core" (9 mandatory attributes for reasonable assurance) or "BRSR Comprehensive" (all Essential and Leadership indicators).'
        },
        {
          num: '3',
          title: 'Preview Section Tabs',
          desc: 'Browse through Section A (General), Section B (Management), and Section C (Principles 1–9) tabs to verify completeness and data populating.'
        },
        {
          num: '4',
          title: 'Review Audit Hash & Seal',
          desc: 'Check the digital seal and statutory compilation timestamp at the top of the report preview.'
        },
        {
          num: '5',
          title: 'Export Statutory Artifacts',
          desc: 'Click "Export PDF" for board filing, "Export Excel" for quantitative XBRL conversion, or "Download Audit Pack" for assurance verifiers.'
        }
      ],
      proTips: [
        'The BRSR Core toggle instantly highlights the 9 statutory attributes subject to mandatory reasonable assurance.',
        'Click on any indicator number directly inside the report preview table to view its full calculation formula and data lineage.'
      ],
      pitfalls: [
        'Generating a report when reporting periods are still in DRAFT status may include unapproved numbers. Always ensure all facilities are approved and consolidated.',
        'SEBI mandates disclosures for both current financial year and previous financial year for trend comparison.'
      ]
    }
  },

  '/assurance': {
    id: 'reasonable-assurance',
    route: '/assurance',
    title: 'Reasonable Assurance & Verifier Portal',
    subtitle: 'Independent third-party verifier environment with substantive sampling and observation tracking',
    badge: 'Third-Party Verifier',
    color: '#0D9488',
    sebiSection: 'SEBI BRSR Core Reasonable Assurance Statement & Verification Workpapers',
    indicators: ['Substantive Statistical Sampling (Top 20% Materiality + Random)', 'Auditor Observations & Deficiencies', 'Management Response Tracking', 'Audit Workpaper Dossier'],
    whatIsIt: `The Reasonable Assurance module provides an independent digital portal designed specifically for external accredited sustainability assurance providers (e.g., Big 4, statutory audit firms). It features a statistical sampling engine for substantive testing, an auditor observation/deficiency tracker, and automated workpaper generation.`,
    whyNecessary: `SEBI circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122 mandates Reasonable Assurance on BRSR Core attributes for the top listed companies. Traditional audit procedures involving email exchange of invoices are painfully slow and risk security leaks. This portal gives verifiers direct, controlled access to cryptographic evidence without altering data.`,
    brsrContribution: `Generates the formal Independent Assurance Workpaper and tracks verifier sign-offs required to publish the final Assurance Statement in the company’s annual report and regulatory stock exchange filings.`,
    rolesGuide: [
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Create or access your assurance engagement. Configure sampling criteria (materiality percentage and stratification), inspect sampled project data points, raise formal findings, and review management responses.'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Monitor auditor inquiries and findings. Coordinate with facility engineers to supply additional documentation and provide formal management responses to verifier observations.'
      },
      {
        role: 'BU Admin / Department Head',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Assist corporate ESG in addressing site-specific auditor observations relating to operations in your Business Unit.'
      },
      {
        role: 'Project Admin / Site Engineer',
        badge: 'Maker',
        color: '#059669',
        action: 'Review auditor requests for your project and provide additional utility logs or meter calibration certificates if requested.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Open or Create Engagement',
          desc: 'Select your active assurance engagement or click "+ New Engagement" to define the assurance firm, lead partner, and scope indicators.'
        },
        {
          num: '2',
          title: 'Generate Statistical Sample',
          desc: 'Click "Run Substantive Sampling". The system stratifies population items, automatically including 100% of top material contributors and a random representative sample of remaining sites.'
        },
        {
          num: '3',
          title: 'Substantive Testing & Evidence Inspection',
          desc: 'Click on any sampled item to inspect the reported figure, calculation steps, and attached primary voucher in the Evidence Vault.'
        },
        {
          num: '4',
          title: 'Log Finding / Inquiry',
          desc: 'If an anomaly or discrepancy is identified, click "Raise Finding", specify materiality (Material vs. Non-material), and submit recommendations.'
        },
        {
          num: '5',
          title: 'Export Audit Workpapers',
          desc: 'Click "Export Assurance Workpaper" to download the complete verification file with all SHA-256 evidence digests.'
        }
      ],
      proTips: [
        'The sampling engine guarantees reproducible selection based on deterministic statistical stratification.',
        'Verifiers can inspect the complete immutable audit trail for any data point with a single click.'
      ],
      pitfalls: [
        'Closing an assurance engagement before all "Material" findings have formal management responses will prevent clean assurance sign-off.',
        'External verifiers must never be granted "Maker" or "Checker" data entry roles.'
      ]
    }
  },

  '/audit': {
    id: 'audit-trail',
    route: '/audit',
    title: 'Cryptographic Immutable Audit Trail',
    subtitle: 'SHA-256 blockchain-style chained ledger recording every action, user, change diff, and timestamp',
    badge: 'Integrity Backbone',
    color: '#DC2626',
    sebiSection: 'Cross-cutting Regulatory Compliance & Non-Repudiation Proof',
    indicators: ['SHA-256 Chained Hash Records', 'Before & After JSON Change Diffs', 'Actor Identity & Timestamp Lineage', 'Ledger Integrity Verification Engine'],
    whatIsIt: `The Audit Trail is the enterprise tamper-evident ledger that runs across every single action in the AAROHAN platform. Every data point saved, voucher uploaded, submission approved, exception waived, or value consolidated is captured as an immutable event. Each record stores who performed it, what changed (structured before-and-after diff), when it occurred, the IP address, and is cryptographically chained to the previous record using SHA-256.`,
    whyNecessary: `Regulatory inquiries, legal disputes, and SEBI investigations require absolute non-repudiation. Standard database logs can be edited or deleted by database administrators. A cryptographically chained ledger makes retroactive tampering mathematically impossible: changing a single historical value breaks the hash chain for all subsequent records.`,
    brsrContribution: `Guarantees the legal validity and authenticity of every figure in the final BRSR report. Provides verifiers and regulators with conclusive proof of data integrity.`,
    rolesGuide: [
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Run the "Verify Ledger Integrity" test. Inspect audit events for sampled high-materiality metrics to verify chronological sequence and ensure figures were not altered post-approval.'
      },
      {
        role: 'Group Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Review administrative and user governance events. Monitor for unusual patterns, after-hours data modifications, or frequent permission changes.'
      },
      {
        role: 'BU Admin / Department Head',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Inspect the historical changelog for any disputed submissions to see exactly who made edits and when.'
      },
      {
        role: 'Project Admin / Site Engineer',
        badge: 'Maker',
        color: '#059669',
        action: 'Read-only access. Site engineers can inspect the historical record of their own submissions and changes.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Browse Chronological Events',
          desc: 'View real-time event logs with event sequence number, action type (e.g. SUBMISSION_CREATE, EVIDENCE_UPLOAD, APPROVAL), actor name, and timestamp.'
        },
        {
          num: '2',
          title: 'Inspect Change Diffs',
          desc: 'Click on any event row to expand the structured JSON before-and-after diff, highlighting exactly which fields and values were modified.'
        },
        {
          num: '3',
          title: 'Filter by Target or Actor',
          desc: 'Use top filters to search events by specific Target Type (Submission, Evidence, OrgNode), Actor Email, or Action Type.'
        },
        {
          num: '4',
          title: 'Inspect Cryptographic Hashes',
          desc: 'Click the security shield icon on any record to view its previous hash (prev_hash) and computed record hash (record_hash).'
        },
        {
          num: '5',
          title: 'Run Chain Integrity Audit',
          desc: 'Press "Verify Ledger Integrity" to scan the entire blockchain-style audit table. The engine recalculates all SHA-256 hashes sequentially to confirm 100% chain validity.'
        }
      ],
      proTips: [
        'The ledger verification engine runs in linear time and immediately pinpoints the exact sequence number if any row has been altered.',
        'Use the sequence ID as a formal reference in external auditor workpapers.'
      ],
      pitfalls: [
        'Audit logs cannot be deleted or pruned under any circumstances; doing so immediately invalidates the cryptographic chain.',
        'Never share individual user credentials; every action is permanently attributed to the logged-in user ID.'
      ]
    }
  },

  '/dashboard': {
    id: 'executive-dashboard',
    route: '/dashboard',
    title: 'Executive ESG Dashboard & Overview',
    subtitle: 'High-level executive overview of ESG indicators, reporting readiness, and statutory milestones',
    badge: 'Executive Oversight',
    color: '#0070F3',
    sebiSection: 'Executive Summary & BRSR Core Readiness Monitoring',
    indicators: ['Overall Submission Completion %', 'Total GHG Footprint (tCO₂e)', 'Renewable Energy Share %', 'Open Exceptions Count'],
    whatIsIt: `The Executive Dashboard provides an executive command center displaying real-time sustainability KPIs, submission progress across subsidiaries and business units, greenhouse gas emissions breakdown (Scope 1, 2, and 3), renewable energy mix, and BRSR filing readiness.`,
    whyNecessary: `Executive leadership and Board Sustainability Committees need continuous visibility over regulatory filing progress to ensure deadlines are met without last-minute panic or non-compliance penalties under SEBI rules.`,
    brsrContribution: `Aggregates high-level metrics that feed into executive summaries, Board presentations, and director reports accompanying the annual BRSR filing.`,
    rolesGuide: [
      {
        role: 'Group Admin / Executive Leadership',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Monitor overall reporting progress across all subsidiaries. Identify lagging BUs and ensure corporate sustainability targets are tracked.'
      },
      {
        role: 'BU Admin / Department Head',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Review your Business Unit’s submission completion rate and compare environmental intensity against peer business units.'
      },
      {
        role: 'Project Admin / Site Engineer',
        badge: 'Maker',
        color: '#059669',
        action: 'Check current reporting period status, submission deadlines, and verify whether project packs have been signed off.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Review overall corporate materiality trends and identify priority operational areas for substantive testing.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Select Active Financial Period',
          desc: 'Toggle between financial years and reporting periods from the top header selector.'
        },
        {
          num: '2',
          title: 'Review Top Metric Cards',
          desc: 'Examine high-level metrics: Total Scope 1+2 Emissions, Renewable Energy %, Water Recycled %, and Lost Time Injuries.'
        },
        {
          num: '3',
          title: 'Track Submission Progress',
          desc: 'Review the Progress Bar showing submitted vs. approved vs. pending packs across the operating entities.'
        },
        {
          num: '4',
          title: 'Inspect Operational Trends',
          desc: 'Analyze month-by-month trend charts for seasonal energy spikes or emission reduction progress.'
        },
        {
          num: '5',
          title: 'Jump to Action Items',
          desc: 'Click on alert cards (e.g. "5 Open Exceptions") to navigate directly to the resolution desk.'
        }
      ],
      proTips: [
        'Use the "Quick Journey Launcher" in the header to navigate through the 8 statutory pillars of the platform.',
        'Hover over any chart segment to see individual entity contribution numbers.'
      ],
      pitfalls: [
        'Dashboard figures reflect active approved submissions; if a facility has not submitted data, figures represent partial operational totals.'
      ]
    }
  },

  '/org': {
    id: 'org-hierarchy',
    route: '/org',
    title: 'Organizational Hierarchy & Boundary Definition',
    subtitle: 'Enterprise tree structure defining reporting boundaries, equity ownership, and control types',
    badge: 'Boundary Definition',
    color: '#8B5CF6',
    sebiSection: 'Section A — General Information (Reporting Boundary & Group Entities)',
    indicators: ['Consolidated Reporting Boundary', 'Operational Control (100%)', 'Financial Control & Joint Ventures (Equity %)', 'Entity Mapping'],
    whatIsIt: `The Organizational Hierarchy defines the structural reporting tree of the enterprise: Holding Group $\\to$ Subsidiaries $\\to$ Business Units $\\to$ Operational Projects and Manufacturing Sites. Crucially, it sets the statutory reporting boundary (In-Boundary vs. Out-of-Boundary) and control type (Operational Control vs. Financial Control vs. Equity Share).`,
    whyNecessary: `SEBI BRSR and GHG Protocol guidelines require clear definition of operational boundaries. Disclosing emissions without properly accounting for Joint Ventures or excluding subsidiaries without statutory justification violates disclosure standards. This module establishes the single source of truth for organizational rollups.`,
    brsrContribution: `Directly populates Section A: General Disclosures (Details of holding, subsidiary, joint venture, and associate companies; boundary of reporting). Dictates the weighting percentages used by the consolidation engine.`,
    rolesGuide: [
      {
        role: 'Group Admin / System Admin',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Configure the organizational tree, add legal entities and operating sites, assign parent-child relationships, and set statutory boundary parameters.'
      },
      {
        role: 'Subsidiary & BU Admins',
        badge: 'Checker',
        color: '#6366F1',
        action: 'Review their assigned business unit subtree and ensure all active operating projects and facilities are represented.'
      },
      {
        role: 'External Auditor / Assurance Provider',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Verify that the reporting boundary matches the audited statutory financial statements and annual balance sheet entity list.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Explore Tree View',
          desc: 'Expand and collapse nodes to view the relationship between Holding Group, Legal Subsidiaries, BUs, and Projects.'
        },
        {
          num: '2',
          title: 'Inspect Node Boundary Rules',
          desc: 'Click any node to open its properties drawer showing Ownership %, Control Type, Project Type, and In-Boundary toggle.'
        },
        {
          num: '3',
          title: 'Add New Node',
          desc: 'Click "+ Add Entity Node", select the parent entity, enter node name and unique code, and assign boundary rules.'
        },
        {
          num: '4',
          title: 'Configure Equity Share',
          desc: 'For Joint Ventures, specify the exact equity ownership percentage (e.g. 51.0%) to ensure prorated consolidation math.'
        }
      ],
      proTips: [
        'Nodes flagged as Out-of-Boundary are excluded from statutory consolidation calculations but can be tracked for internal operational metrics.',
        'Use the tree search bar to quickly jump to any project by name or site code.'
      ],
      pitfalls: [
        'Deleting an organizational node that contains historical data points is strictly prohibited to preserve historical reporting lineage.'
      ]
    }
  },

  '/projects': {
    id: 'projects-hub',
    route: '/projects',
    title: 'Project Hub & Site Monitoring',
    subtitle: 'Comprehensive operational project and facility management console',
    badge: 'Site Operations',
    color: '#059669',
    sebiSection: 'Section A & Section C Facility-Level Data',
    indicators: ['Site Operating Status', 'Project Type & Location', 'Assigned Engineering Personnel', 'Monthly Submission Status'],
    whatIsIt: `The Project Hub is the directory of all operational infrastructure projects, manufacturing plants, sites, and regional offices across all business units. It tracks project status (Active, Inactive, Completed), geo-location, assigned team members, and data submission health.`,
    whyNecessary: `Large industrial and infrastructure conglomerates manage dozens of diverse sites. Tracking which sites have onboarded ESG meters and submitted monthly data is essential to avoid reporting blind spots.`,
    brsrContribution: `Projects represent the leaf nodes that feed data into Section A (Plant locations, Operations in India and International) and Section C (Site-level energy, water, and safety disclosures).`,
    rolesGuide: [
      {
        role: 'Project Admin / Site Engineer',
        badge: 'Maker',
        color: '#059669',
        action: 'Manage your assigned site profile, review historical monthly submissions, and access the data entry form.'
      },
      {
        role: 'BU Admin / Department Head',
        badge: 'Checker',
        color: '#0EA5E9',
        action: 'Monitor project completion rates, onboard new projects via the Project Wizard, and track site-level compliance.'
      },
      {
        role: 'External Auditor',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Audit facility locations and verify operational dates against municipal permits and environmental clearances.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Filter & Search Projects',
          desc: 'Filter projects by Business Unit, Status (Active, Completed), or search by project code.'
        },
        {
          num: '2',
          title: 'Inspect Project Detail Card',
          desc: 'Click on any project to view its full details: facility type, coordinates, assigned engineers, and submission timeline.'
        },
        {
          num: '3',
          title: 'Onboard New Facility',
          desc: 'Click "+ New Project" to launch the guided Project Onboarding Wizard.'
        }
      ],
      proTips: [
        'Check the "Data Health Badge" on each project card to see immediately if that site has submitted data for the active month.'
      ],
      pitfalls: [
        'Do not mark a project "Inactive" during an ongoing reporting year if it had operational consumption during any month of that year.'
      ]
    }
  },

  '/valuechain': {
    id: 'value-chain',
    route: '/valuechain',
    title: 'Value Chain Scope 3 (SEBI 75% Rule)',
    subtitle: 'Upstream and downstream value chain partners accounting under SEBI BRSR Core',
    badge: 'Scope 3 Mandate',
    color: '#D97706',
    sebiSection: 'Section C — Principle 6 (Value Chain Disclosures & 75% Rule)',
    indicators: ['Top 75% Suppliers by Spend/Value', 'Scope 3 Category 1-15 Emissions', 'Supplier ESG Onboarding', 'Spend-Based & Activity Estimations'],
    whatIsIt: `The Value Chain module addresses SEBI’s mandate requiring top listed companies to report ESG disclosures for their value chain covering at least 75% of purchases/sales by value. It manages key upstream suppliers and downstream logistics partners, tracks their ESG metrics, and computes Scope 3 emissions.`,
    whyNecessary: `Under SEBI guidelines, Scope 3 and value chain oversight is a major regulatory frontier. Companies that fail to track emissions from transport, raw material supply, and major subcontractors cannot claim comprehensive sustainability compliance.`,
    brsrContribution: `Populates Section C Principle 6 Leadership Indicators and the new SEBI Value Chain BRSR Core disclosures regarding emissions and safety in the supply chain.`,
    rolesGuide: [
      {
        role: 'Corporate ESG Lead / Procurement Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Ingest supplier spend data, identify the top 75% value partners, send supplier ESG questionnaires, and compute Scope 3 emissions.'
      },
      {
        role: 'External Auditor',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Verify that the selected supplier list genuinely constitutes $\\ge 75\\%$ of total procurement spend and audit Scope 3 conversion methodologies.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Review 75% Spend Coverage',
          desc: 'Inspect the cumulative spend chart to confirm your tracked suppliers meet the SEBI 75% value threshold.'
        },
        {
          num: '2',
          title: 'Add / Import Suppliers',
          desc: 'Register key vendors and contractors with work category, billed volume, and annual spend.'
        },
        {
          num: '3',
          title: 'Compute Scope 3 Emissions',
          desc: 'Apply DEFRA/IPCC spend-based or fuel-based emission factors to calculate Scope 3 categories (freight, diesel hauling, employee commute).'
        }
      ],
      proTips: [
        'Use activity-based data (e.g. actual fuel liters consumed by freight contractors) whenever available over spend-based approximations for higher assurance quality.'
      ],
      pitfalls: [
        'Failing to reach the 75% spend threshold will trigger a compliance warning in the statutory BRSR filing validator.'
      ]
    }
  },

  '/metrics': {
    id: 'metric-catalogue',
    route: '/metrics',
    title: 'ESG Metric Catalogue & Indicator Library',
    subtitle: 'Standardized indicator registry mapped to SEBI BRSR Principles, Core KPIs, and units',
    badge: 'Master Catalogue',
    color: '#0891B2',
    sebiSection: 'Standards Mapping & Indicator Metadata (Principles 1–9)',
    indicators: ['Essential vs. Leadership Indicators', 'BRSR Core Flag', 'Base Unit & Dimension', 'Evidence Rule (Mandatory vs. Optional)'],
    whatIsIt: `The Metric Catalogue is the master taxonomy of all ESG indicators tracked in the system. It maps each statutory code (e.g., ENV-ENERGY-001) to its SEBI Principle, indicator type (Essential vs. Leadership), BRSR Core status, allowed units, conversion multipliers, and evidence requirement rules.`,
    whyNecessary: `Standardization is vital. If different sites use differing definitions of "energy consumption" or report in incompatible units, consolidation is impossible. The master catalogue enforces unified definitions across the entire enterprise.`,
    brsrContribution: `Defines the statutory layout and table headers for the entire final report.`,
    rolesGuide: [
      {
        role: 'System Admin / Corporate ESG Lead',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Maintain indicator metadata, configure statutory formula links, and toggle evidence rules.'
      },
      {
        role: 'Site Engineers & Reviewers',
        badge: 'General',
        color: '#64748B',
        action: 'Reference the catalogue to review measurement definitions, statutory guidance, and required evidence types.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Search & Filter Indicators',
          desc: 'Filter by Principle (1 through 9), Indicator Type (Essential vs Leadership), or search by metric code.'
        },
        {
          num: '2',
          title: 'Inspect Indicator Details',
          desc: 'Click on any metric card to view its statutory definition, base unit, allowed conversion units, and whether supporting evidence is mandatory.'
        }
      ],
      proTips: [
        'Indicators marked with the "BRSR Core" badge are subject to mandatory Reasonable Assurance under SEBI regulations.'
      ],
      pitfalls: [
        'Do not alter base units for existing metrics during an active reporting cycle as this would invalidate historical comparisons.'
      ]
    }
  },

  '/admin/users': {
    id: 'user-management',
    route: '/admin/users',
    title: 'User Management & Role-Based Access Control',
    subtitle: 'User provisioning, cryptographic security, and Segregation of Duties management',
    badge: 'Security & Access',
    color: '#DC2626',
    sebiSection: 'Section B — Governance & Internal Controls',
    indicators: ['System Admin', 'Group Admin', 'Subsidiary Admin', 'BU Admin', 'Project Admin', 'External Auditor'],
    whatIsIt: `The User Management console controls user identity, role assignments, organizational scoping, and security policies. It enforces strict Role-Based Access Control (RBAC) ensuring users only access data within their assigned operational boundary and prevents conflicting Maker-Checker privileges.`,
    whyNecessary: `SEBI and corporate auditors require strict user governance. Allowing unauthorized users to view sensitive environmental liabilities or allowing site engineers to approve their own submissions violates basic governance norms.`,
    brsrContribution: `Substantiates Section B internal governance controls and provides verifiers with proof of secure access control.`,
    rolesGuide: [
      {
        role: 'System Admin',
        badge: 'Superuser',
        color: '#F43F5E',
        action: 'Provision user accounts, assign roles, enforce password policies, and assign organizational scope boundaries.'
      },
      {
        role: 'External Auditor',
        badge: 'Verifier',
        color: '#F59E0B',
        action: 'Audit user roles to confirm segregation of duties between operational makers and managerial checkers.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Invite / Create User',
          desc: 'Click "+ Add User", enter name, business email, initial password, and select their role (e.g. Project Admin, BU Admin, External Auditor).'
        },
        {
          num: '2',
          title: 'Assign Organizational Scope',
          desc: 'Assign the exact node (e.g. specific Project or BU) the user is authorized to manage.'
        },
        {
          num: '3',
          title: 'Enforce Role Segregation',
          desc: 'Ensure no single user is granted both Maker (Project Admin) and Checker (BU Admin) roles over the same facility.'
        }
      ],
      proTips: [
        'External Auditors should always be assigned the "External Auditor" role which provides read-only access with sampling capabilities.'
      ],
      pitfalls: [
        'Assigning a user to the Group Root node gives them enterprise-wide access. Restrict site engineers strictly to their project node.'
      ]
    }
  },

  '/trash': {
    id: 'trash-can',
    route: '/trash',
    title: 'Hierarchical Trash Can & Recovery',
    subtitle: 'Two-stage soft-deletion archive with password confirmation and reason audit logging',
    badge: 'Data Protection',
    color: '#64748B',
    sebiSection: 'Audit Trail & Non-Destructive Data Retention',
    indicators: ['Soft-Deleted Records', 'Deletion Reason & Approver ID', 'One-Click Restore', 'Permanent Purge with Admin Password'],
    whatIsIt: `The Hierarchical Trash Can provides non-destructive data recovery. When an evidence document, project node, or user is deleted, it is soft-deleted, moved to the Trash Can with the deletion reason and timestamp, and can be restored or purged.`,
    whyNecessary: `Accidental deletion of evidence vouchers or project data can severely compromise statutory audits. The two-stage trash mechanism prevents irreversible data loss and ensures every deletion is recorded in the audit trail.`,
    brsrContribution: `Maintains audit trail continuity and prevents lost evidence during assurance reviews.`,
    rolesGuide: [
      {
        role: 'System Admin / Group Admin',
        badge: 'Oversight',
        color: '#8B5CF6',
        action: 'Review deleted items, approve restorations, or permanently purge obsolete records with admin password confirmation.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Browse Deleted Items',
          desc: 'Inspect soft-deleted evidence files, projects, or submissions.'
        },
        {
          num: '2',
          title: 'Review Deletion Audit Note',
          desc: 'Read the logged reason and the identity of the user who initiated the deletion.'
        },
        {
          num: '3',
          title: 'Restore Item',
          desc: 'Click "Restore" to return the item to active status with full historical linkages intact.'
        }
      ],
      proTips: [
        'Restoring an evidence document automatically reconnects all its previous links to data points.'
      ],
      pitfalls: [
        'Permanent purge is irreversible. Only purge items that have zero relevance to past or current statutory filing years.'
      ]
    }
  },

  '/aarohan': {
    id: 'aarohan-ai',
    route: '/aarohan',
    title: 'Ask AAROHAN AI Regulatory Copilot',
    subtitle: 'AI copilot for SEBI BRSR guidance, evidence extraction, and anomaly explanations',
    badge: 'AI Governance',
    color: '#8B5CF6',
    sebiSection: 'AI Governance & Grounded Statutory Compliance ("AI proposes, Human disposes")',
    indicators: ['E1 OCR Extraction', 'E2 Statistical Anomaly Explainer', 'E3 Statutory Guidance RAG', 'E7 Metric Explainer'],
    whatIsIt: `Aarohan AI is the dedicated ESG regulatory intelligence assistant built into the platform. Operating under strict SEBI compliance guardrails ("AI proposes, human disposes"), it helps users extract data from utility bills, explain SEBI guidance for confusing indicators, draft corporate policy descriptions, and understand why certain numbers spiked.`,
    whyNecessary: `SEBI BRSR terminology can be complex for field engineers. Aarohan AI provides instantaneous, grounded answers cited directly from official SEBI guidance and corporate policies, reducing reliance on expensive external consultants.`,
    brsrContribution: `Accelerates report preparation, reduces data entry errors, and provides grounded explanations for complex Section B and C reporting requirements.`,
    rolesGuide: [
      {
        role: 'All Users',
        badge: 'General',
        color: '#8B5CF6',
        action: 'Ask questions regarding reporting rules, indicator definitions, or how to classify operational energy and emissions.'
      }
    ],
    userManual: {
      steps: [
        {
          num: '1',
          title: 'Type Your Regulatory Question',
          desc: 'Ask questions such as "How do I account for green tariff electricity under Principle 6?" or "What constitutes a reportable Lost Time Injury under Principle 3?".'
        },
        {
          num: '2',
          title: 'Review Grounded Citations',
          desc: 'Examine the response, which cites the exact SEBI Principle and statutory section.'
        },
        {
          num: '3',
          title: 'Apply Suggestions with Human Approval',
          desc: 'Review suggested text and approve or edit before pasting into corporate disclosure forms.'
        }
      ],
      proTips: [
        'Aarohan AI enforces strict PII redaction and prompt injection guards to maintain enterprise privacy.'
      ],
      pitfalls: [
        'Never treat AI suggestions as final without human review; statutory responsibility remains with the corporate filer.'
      ]
    }
  }
};

/**
 * Helper to retrieve the matching feature guide based on current pathname.
 */
export function getGuideForRoute(pathname) {
  if (!pathname) return FEATURE_GUIDES['/dashboard'];

  // Exact match
  if (FEATURE_GUIDES[pathname]) {
    return FEATURE_GUIDES[pathname];
  }

  // Prefix matches (e.g. /projects/new or /projects/123 -> /projects)
  if (pathname.startsWith('/projects')) {
    return FEATURE_GUIDES['/projects'];
  }
  if (pathname.startsWith('/disclosure/')) {
    return FEATURE_GUIDES['/reporting'];
  }
  if (pathname.startsWith('/admin/users')) {
    return FEATURE_GUIDES['/admin/users'];
  }
  if (pathname.startsWith('/admin/jobs')) {
    return FEATURE_GUIDES['/consolidation'];
  }

  // Fallback default
  return FEATURE_GUIDES['/dashboard'];
}
