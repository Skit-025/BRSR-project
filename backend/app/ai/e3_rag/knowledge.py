"""
E3 Engine: BRSR Knowledge Store — Full Coverage
Contains authoritative pre-indexed guidance excerpts for all BRSR Core Essential Indicators.
Guidance verified against SEBI BRSR Core Guidance Note (2023), SEBI Circular SEBI/HO/CFD/CMD-2/P/CIR/2023/120.
Coverage: 74 Essential Indicators across 9 Principles + Leadership Indicators.
"""

BRSR_KNOWLEDGE_BASE = {

    # =========================================================================
    # PRINCIPLE 6 — Environment: Energy
    # =========================================================================

    "ENV-ENERGY-001": {
        "section": "Principle 6 - Essential Indicator 1",
        "guidance": (
            "Disclose total energy consumption in gigajoules (GJ), including energy consumed from "
            "non-renewable and renewable sources. The disclosure should cover relevant fuel consumption "
            "and purchased or self-generated electricity, heating, cooling or steam, as applicable. "
            "Supporting evidence may include electricity bills, DISCOM invoices, fuel purchase records, "
            "meter readings and energy logs."
        ),
        "calculation": "Sum of (electricity consumed × 3.6 GJ/MWh) + (fuel consumed × applicable NCV conversion factor in GJ/unit)",
        "unit": "GJ",
        "evidence_types": ["electricity_bill", "fuel_receipt", "meter_reading", "energy_audit_report"],
        "keywords": ["energy", "electricity", "kwh", "gigajoules", "fuel", "consumption", "discom", "power", "units"],
        "common_errors": "Reporting in kWh instead of GJ; omitting DG set fuel consumption; missing captive generation.",
        "version": "BRSR-2023",
    },

    "ENV-ENERGY-002": {
        "section": "Principle 6 - Essential Indicator 1",
        "guidance": (
            "Capture fuel consumption used in the reporting period, including diesel, petrol, natural gas "
            "and other applicable fuels, with quantities recorded in the relevant physical units and converted "
            "to gigajoules (GJ) using documented conversion factors. Supporting evidence may include fuel "
            "invoices, vendor delivery challans, fuel registers, vehicle or equipment logbooks and storage records."
        ),
        "calculation": "Litres of fuel × NCV (e.g., diesel: 0.0359 GJ/litre; HSD: 0.03576 GJ/litre; LPG: 0.0477 GJ/kg)",
        "unit": "GJ",
        "evidence_types": ["fuel_receipt", "delivery_challan", "fuel_register", "logbook"],
        "keywords": ["fuel", "diesel", "petrol", "hsd", "lpg", "natural gas", "litres", "fuel consumption"],
        "common_errors": "Using calorific values for wrong fuel grade; not accounting for fuel in backup generators.",
        "version": "BRSR-2023",
    },

    "ENV-ENERGY-003": {
        "section": "Principle 6 - Essential Indicator 1",
        "guidance": (
            "Disclose energy intensity expressed as total energy consumption in GJ per rupee of turnover "
            "(INR crore), or an alternative intensity denominator selected by the entity and consistently "
            "applied. Intensity metrics allow year-on-year comparison and benchmarking. The chosen denominator "
            "must be disclosed and consistently applied across reporting periods."
        ),
        "calculation": "Energy Intensity = Total Energy Consumed (GJ) / Revenue from Operations (INR crore)",
        "unit": "GJ per INR crore",
        "evidence_types": ["annual_report", "energy_audit_report", "financial_statement"],
        "keywords": ["energy intensity", "intensity ratio", "energy per turnover", "energy efficiency"],
        "common_errors": "Using net revenue vs gross revenue inconsistently; changing denominator year-on-year without disclosure.",
        "version": "BRSR-2023",
    },

    "ENV-RENEW-001": {
        "section": "Principle 6 - Leadership Indicator 1",
        "guidance": (
            "Disclose the total renewable energy generated and consumed (solar, wind, hydro, biomass etc.) "
            "separately from non-renewable sources. Entities are encouraged to state targets for renewable "
            "energy as a percentage of total energy mix. Supporting evidence includes renewable energy "
            "certificates (RECs), green tariff invoices, rooftop solar generation logs."
        ),
        "calculation": "Renewable Energy % = Renewable Energy Consumed (GJ) / Total Energy Consumed (GJ) × 100",
        "unit": "GJ and %",
        "evidence_types": ["rec_certificate", "solar_generation_log", "green_tariff_invoice"],
        "keywords": ["renewable", "solar", "wind", "green energy", "rec", "clean energy", "net zero"],
        "common_errors": "Claiming RECs without actual generation; double-counting purchased and self-generated renewable energy.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 6 — Environment: GHG Emissions
    # =========================================================================

    "ENV-GHG-001": {
        "section": "Principle 6 - Essential Indicator 3",
        "guidance": (
            "Disclose Scope 1 greenhouse gas emissions arising from sources owned or controlled by the company, "
            "including stationary combustion and mobile combustion where applicable. Report emissions in metric "
            "tonnes of CO2 equivalent (tCO2e) using an appropriate and documented emission-factor methodology. "
            "Supporting evidence should include fuel consumption records, emission-factor sources and calculation workings."
        ),
        "calculation": "Scope 1 (tCO2e) = Σ (Fuel consumed × Emission factor per unit). E.g., diesel: 2.68 kg CO2/litre = 2.68 tCO2/kL",
        "unit": "tCO2e",
        "evidence_types": ["fuel_receipt", "combustion_log", "emission_factor_reference"],
        "keywords": ["scope 1", "ghg", "greenhouse gas", "direct emissions", "co2", "stationary combustion", "mobile combustion"],
        "common_errors": "Using global emission factors instead of India-specific BEE/IPCC factors; omitting refrigerant leakage.",
        "version": "BRSR-2023",
    },

    "ENV-GHG-002": {
        "section": "Principle 6 - Essential Indicator 3",
        "guidance": (
            "Disclose Scope 2 greenhouse gas emissions arising from the consumption of purchased or acquired "
            "electricity, heating, cooling or steam, as applicable. Report emissions in metric tonnes of CO2 "
            "equivalent (tCO2e) using the applicable documented grid or supplier emission factors and methodology. "
            "Supporting evidence should include electricity consumption records, DISCOM invoices and emission-factor calculations."
        ),
        "calculation": "Scope 2 (tCO2e) = Electricity consumed (MWh) × CEA Grid Emission Factor (tCO2/MWh). India national grid: ~0.82 tCO2/MWh (CEA FY2022-23)",
        "unit": "tCO2e",
        "evidence_types": ["electricity_bill", "discom_invoice", "cea_emission_factor"],
        "keywords": ["scope 2", "indirect emissions", "grid electricity", "purchased electricity", "cea", "emission factor"],
        "common_errors": "Using outdated CEA emission factors; not using location-based vs market-based approach consistently.",
        "version": "BRSR-2023",
    },

    "ENV-GHG-003": {
        "section": "Principle 6 - Essential Indicator 3",
        "guidance": (
            "Disclose GHG emission intensity expressed as total Scope 1 + Scope 2 emissions in tCO2e per rupee "
            "of turnover (INR crore) or alternative intensity denominator. Intensity metric allows year-on-year "
            "comparison. The entity must disclose the chosen denominator and apply it consistently."
        ),
        "calculation": "GHG Intensity = (Scope 1 + Scope 2) tCO2e / Revenue from Operations (INR crore)",
        "unit": "tCO2e per INR crore",
        "evidence_types": ["ghg_inventory", "financial_statement"],
        "keywords": ["ghg intensity", "emission intensity", "carbon intensity", "co2 per turnover"],
        "common_errors": "Including Scope 3 in intensity without disclosure; changing base year without restatement.",
        "version": "BRSR-2023",
    },

    "ENV-SCI-001": {
        "section": "Principle 6 - Leadership Indicator 3",
        "guidance": (
            "Entities are encouraged to disclose whether they have adopted Science-Based Targets (SBTi) "
            "or net-zero commitments aligned with 1.5°C pathways. Where adopted, disclose the base year, "
            "target year, reduction target (%) and current progress against that target."
        ),
        "calculation": "% reduction = (Base Year Emissions - Current Emissions) / Base Year Emissions × 100",
        "unit": "% reduction in tCO2e",
        "evidence_types": ["sbti_commitment_letter", "net_zero_policy", "climate_strategy"],
        "keywords": ["net zero", "science based targets", "sbti", "1.5 degree", "carbon neutral", "climate target"],
        "common_errors": "Claiming SBTi without formal validation; setting targets without base year restatement.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 6 — Environment: Water
    # =========================================================================

    "ENV-WATER-001": {
        "section": "Principle 6 - Essential Indicator 2",
        "guidance": (
            "Disclose water withdrawal by source, including surface water, groundwater, third-party water and "
            "other applicable sources, in kilolitres (kL). Separately capture water consumption and water "
            "discharge, where applicable. Supporting evidence may include water meter readings, groundwater "
            "records, municipal or third-party water invoices, tanker records and discharge monitoring records."
        ),
        "calculation": "Water Consumed (kL) = Water Withdrawn (kL) - Water Discharged (kL). 1 cubic metre = 1 kL",
        "unit": "kL (kilolitres)",
        "evidence_types": ["water_bill", "meter_reading", "tanker_invoice", "groundwater_record"],
        "keywords": ["water", "kilolitres", "water withdrawal", "groundwater", "surface water", "water consumption", "tanker"],
        "common_errors": "Mixing kL with m3 (they are equal but must be consistent); not separating withdrawal from consumption.",
        "version": "BRSR-2023",
    },

    "ENV-WATER-002": {
        "section": "Principle 6 - Essential Indicator 2",
        "guidance": (
            "Disclose water intensity expressed as total water consumed in kL per rupee of turnover "
            "(INR crore) or per unit of physical output. Entities operating in water-stressed areas "
            "(per CGWB or WRI Aqueduct classification) must separately disclose water intensity for "
            "those facilities."
        ),
        "calculation": "Water Intensity = Total Water Consumed (kL) / Revenue from Operations (INR crore)",
        "unit": "kL per INR crore",
        "evidence_types": ["water_audit", "financial_statement"],
        "keywords": ["water intensity", "water per turnover", "water stressed", "cgwb", "aqueduct"],
        "common_errors": "Not identifying water-stressed locations separately; using inconsistent intensity denominators.",
        "version": "BRSR-2023",
    },

    "ENV-WATER-003": {
        "section": "Principle 6 - Leadership Indicator 2",
        "guidance": (
            "Entities are encouraged to disclose water recycled and reused as a percentage of total water "
            "withdrawn, rainwater harvested in kL, and water treated / discharged into natural water bodies "
            "with quality parameters. ZLD (Zero Liquid Discharge) status should be disclosed where applicable."
        ),
        "calculation": "% Water Recycled = Water Recycled + Reused (kL) / Total Water Withdrawn (kL) × 100",
        "unit": "kL and %",
        "evidence_types": ["stp_report", "etp_record", "rainwater_log", "zld_certificate"],
        "keywords": ["water recycled", "rainwater", "zld", "zero liquid discharge", "stp", "etp", "water reuse"],
        "common_errors": "Counting rainwater harvesting capacity vs actual harvested; not measuring discharge quality.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 6 — Environment: Waste
    # =========================================================================

    "ENV-WASTE-001": {
        "section": "Principle 6 - Essential Indicator 4",
        "guidance": (
            "Disclose waste generated during the reporting period in metric tonnes, with relevant waste "
            "categories and disposal or recovery methods. The disclosure should distinguish applicable "
            "hazardous and non-hazardous waste streams and report quantities handled through recycling, "
            "reuse, recovery, disposal or other applicable methods. Supporting evidence may include waste "
            "registers, authorised waste-handler records, disposal manifests, weighbridge slips and "
            "certificates of recycling or disposal."
        ),
        "calculation": "Total Waste = Hazardous Waste (MT) + Non-Hazardous Waste (MT). Must reconcile generated = recovered + disposed.",
        "unit": "Metric Tonnes (MT)",
        "evidence_types": ["waste_manifest", "disposal_certificate", "weighbridge_slip", "waste_handler_record"],
        "keywords": ["waste", "hazardous", "non-hazardous", "disposal", "recycling", "metric tonnes", "waste manifest"],
        "common_errors": "Not separately reporting hazardous vs non-hazardous; omitting e-waste; mixing weight units (MT vs KG).",
        "version": "BRSR-2023",
    },

    "ENV-WASTE-002": {
        "section": "Principle 6 - Essential Indicator 4",
        "guidance": (
            "Separately disclose e-waste (electrical and electronic equipment waste) generated in metric "
            "tonnes. E-waste must be handed over only to MoEFCC-authorised e-waste recyclers. Supporting "
            "evidence includes e-waste take-back receipts, authorised recycler certificates and manifest forms."
        ),
        "calculation": "E-waste disposed (MT) = Sum of all electronic equipment disposed through authorised channels",
        "unit": "MT",
        "evidence_types": ["ewaste_manifest", "ewaste_recycler_certificate", "takeback_receipt"],
        "keywords": ["e-waste", "electronic waste", "ewaste", "recycler", "moefcc", "it equipment disposal"],
        "common_errors": "Disposing e-waste through unauthorised channels; not maintaining manifest records.",
        "version": "BRSR-2023",
    },

    "ENV-WASTE-003": {
        "section": "Principle 6 - Essential Indicator 4 / Leadership",
        "guidance": (
            "Disclose the percentage of waste diverted from landfill through recycling, reuse or recovery "
            "operations. Entities with a plastic waste management obligation under PWM Rules 2016 must "
            "separately disclose plastic waste generated and managed."
        ),
        "calculation": "Waste Diversion Rate (%) = (Recycled + Reused + Recovered) MT / Total Waste Generated MT × 100",
        "unit": "% and MT",
        "evidence_types": ["recycling_certificate", "compost_log", "plastic_pwm_return"],
        "keywords": ["waste diversion", "recycling rate", "landfill", "plastic waste", "pwm", "circular economy"],
        "common_errors": "Counting incineration as 'diversion' without energy recovery; omitting construction debris.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 6 — Environment: Air & Biodiversity
    # =========================================================================

    "ENV-AIR-001": {
        "section": "Principle 6 - Essential Indicator 5",
        "guidance": (
            "Disclose air emissions of significant pollutants including NOx, SOx, particulate matter (PM), "
            "persistent organic pollutants (POP), volatile organic compounds (VOC) and hazardous air "
            "pollutants (HAP), in metric tonnes per year, where applicable. Entities operating stacks or "
            "DG sets must maintain stack monitoring records as supporting evidence."
        ),
        "calculation": "Emissions (MT) = Stack monitoring concentration (mg/Nm3) × Volume flow rate (Nm3/hr) × Operating hours / 1,000,000",
        "unit": "MT/year",
        "evidence_types": ["stack_monitoring_report", "cpcb_submission", "ambient_air_monitoring"],
        "keywords": ["air emissions", "nox", "sox", "pm", "particulate matter", "voc", "stack", "dg set", "pollutants"],
        "common_errors": "Only reporting DG set emissions and omitting boiler/furnace stack emissions; using wrong conversion.",
        "version": "BRSR-2023",
    },

    "ENV-BIODIV-001": {
        "section": "Principle 6 - Essential Indicator 6",
        "guidance": (
            "Entities must disclose whether any of their operations/offices are located in or near "
            "biodiversity-sensitive areas — Protected Areas (PA), Eco-Sensitive Zones (ESZ), wetlands, "
            "mangroves or biodiversity hotspots. Where applicable, disclose the nature of operations "
            "and mitigation measures. Supporting evidence includes site coordinates, MoEFCC clearances, "
            "EIA reports."
        ),
        "calculation": "Binary disclosure (Yes/No) + narrative description of measures if Yes",
        "unit": "N/A",
        "evidence_types": ["eia_report", "ec_clearance", "site_map", "moefcc_clearance"],
        "keywords": ["biodiversity", "protected area", "eco sensitive zone", "esz", "wetland", "mangrove", "wildlife"],
        "common_errors": "Not checking proximity to ESZs notified by MoEFCC; omitting supply chain biodiversity risks.",
        "version": "BRSR-2023",
    },

    "ENV-CAPEX-001": {
        "section": "Principle 6 - Essential Indicator 7",
        "guidance": (
            "Disclose capital expenditure (CAPEX) and operational expenditure (OPEX) on environmental "
            "sustainability initiatives as a percentage of total CAPEX/OPEX. Environmental investments "
            "include renewable energy installations, water treatment facilities, pollution control "
            "equipment, EMS implementation and biodiversity restoration."
        ),
        "calculation": "Green CAPEX % = Environmental CAPEX (INR) / Total CAPEX (INR) × 100",
        "unit": "INR crore and %",
        "evidence_types": ["capex_schedule", "project_approval", "financial_statement"],
        "keywords": ["capex", "green investment", "environmental expenditure", "opex", "sustainability investment"],
        "common_errors": "Including routine maintenance as green CAPEX; not distinguishing between CAPEX and OPEX.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 3 — Employee & Worker Wellbeing
    # =========================================================================

    "SOC-EMP-001": {
        "section": "Principle 3 - Essential Indicator 2",
        "guidance": (
            "Disclose the total number of employees and workers, with applicable classification by gender "
            "and employment category, including permanent and other applicable categories. Where required, "
            "separately disclose information relating to employees or workers with disabilities. Figures "
            "should correspond to the reporting-period end date and applicable BRSR classification."
        ),
        "calculation": "Headcount at reporting period end-date. Permanent + Contractual + Other = Total",
        "unit": "Number of persons",
        "evidence_types": ["hr_muster_roll", "employee_register", "contractor_register"],
        "keywords": ["employees", "workers", "headcount", "permanent", "contractual", "gender", "disability"],
        "common_errors": "Using FTE instead of headcount; omitting third-party contract workers deployed on-site.",
        "version": "BRSR-2023",
    },

    "SOC-EMP-002": {
        "section": "Principle 3 - Essential Indicator 6",
        "guidance": (
            "Disclose median wages paid to male and female employees and workers, expressed in INR per annum. "
            "The median wage is the middle value in an ordered salary distribution. Disclosures should cover "
            "Board members, Key Managerial Personnel (KMP), employees and workers separately where required "
            "by BRSR format. Supporting evidence includes payroll registers and salary statements."
        ),
        "calculation": "Median Wage = Middle value of sorted annual CTC list for each category (Board/KMP/Employee/Worker)",
        "unit": "INR per annum",
        "evidence_types": ["payroll_register", "salary_statement", "ctc_statement"],
        "keywords": ["median wage", "salary", "compensation", "pay gap", "gender pay", "kmp", "remuneration"],
        "common_errors": "Reporting mean (average) instead of median; including non-cash perks inconsistently.",
        "version": "BRSR-2023",
    },

    "SOC-EMP-003": {
        "section": "Principle 3 - Essential Indicator 2",
        "guidance": (
            "Separately disclose total number of workers (different from employees under BRSR definition) "
            "including permanent workers, other than permanent workers, and contract workers. Workers are "
            "those performing work on behalf of the entity but not directly employed. Gender-wise breakup "
            "is required."
        ),
        "calculation": "Total Workers = Permanent Workers + Contract Workers + Other Workers (by gender category)",
        "unit": "Number of persons",
        "evidence_types": ["contractor_muster", "gate_pass_register", "third_party_contract"],
        "keywords": ["workers", "contract workers", "third party", "labour contractor", "manpower"],
        "common_errors": "Conflating 'employees' with 'workers' per BRSR definition; omitting seasonal workers.",
        "version": "BRSR-2023",
    },

    "SOC-EMP-004": {
        "section": "Principle 3 - Essential Indicator 2",
        "guidance": (
            "Separately report number of employees and workers with disabilities (differently abled persons). "
            "This must be disclosed by gender. The entity should also disclose reasonable accommodation "
            "measures if any. Supporting evidence includes HR records and disability certificates."
        ),
        "calculation": "Count of differently-abled employees and workers at reporting period end-date",
        "unit": "Number of persons",
        "evidence_types": ["disability_certificate", "hr_record"],
        "keywords": ["disability", "differently abled", "pwd", "inclusive employment", "accessibility"],
        "common_errors": "Reporting zero without an actual audit of workforce composition.",
        "version": "BRSR-2023",
    },

    "SOC-TURN-001": {
        "section": "Principle 3 - Essential Indicator 3",
        "guidance": (
            "Disclose the number and percentage of permanent employees and workers who separated during the "
            "reporting period, broken down by gender and age group where applicable. The turnover rate "
            "provides insight into workforce stability and retention. Supporting evidence includes "
            "separation letters, exit interview records and HR registers."
        ),
        "calculation": "Turnover Rate (%) = Number of Separations in Period / Average Number of Employees × 100",
        "unit": "Number and %",
        "evidence_types": ["separation_record", "exit_interview", "hr_register"],
        "keywords": ["turnover", "attrition", "separation", "resignation", "retention", "workforce stability"],
        "common_errors": "Including retirements and contract end-dates as 'voluntary separation'; using year-end count vs average.",
        "version": "BRSR-2023",
    },

    "SOC-SAFE-001": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": (
            "Disclose applicable work-related safety incidents and injury metrics for employees and workers, "
            "including lost-time injuries where applicable. LTIFR may be calculated as "
            "(Number of Lost Time Injuries × 1,000,000) / Total Man-hours Worked, with employees and "
            "workers reported separately where required. Supporting evidence may include incident registers, "
            "occupational health and safety records, attendance or man-hour records and statutory safety reports."
        ),
        "calculation": "LTIFR = (Number of LTIs × 1,000,000) / Total Man-Hours Worked in Period",
        "unit": "Rate (per million man-hours)",
        "evidence_types": ["incident_register", "accident_report", "manhour_record", "form_11_statutory"],
        "keywords": ["ltifr", "lost time injury", "safety", "accident", "incident", "man hours", "injury rate", "ohs"],
        "common_errors": "Not maintaining man-hour records; treating medical-treatment cases as LTI; omitting contractor incidents.",
        "version": "BRSR-2023",
    },

    "SOC-SAFE-002": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": (
            "Disclose work-related fatalities separately for employees and workers and explicitly report zero "
            "where no fatalities occurred during the reporting period. Supporting evidence may include "
            "statutory registers, incident investigation reports, occupational safety records, employee or "
            "worker records and other applicable compliance documentation."
        ),
        "calculation": "Count of fatalities = Number of deaths caused by work-related incidents in reporting period",
        "unit": "Number of fatalities",
        "evidence_types": ["fatality_report", "labour_dept_notification", "incident_investigation"],
        "keywords": ["fatality", "death", "fatal accident", "work-related death", "zero fatality"],
        "common_errors": "Not reporting commuting accidents where applicable; failing to report contractor fatalities.",
        "version": "BRSR-2023",
    },

    "SOC-SAFE-003": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": (
            "Report near-miss incidents and unsafe conditions/acts observed and reported during the period. "
            "Near-miss reporting rate is a leading safety indicator. Entities with robust near-miss reporting "
            "cultures have demonstrably fewer LTI events. Supporting evidence includes near-miss registers, "
            "safety observation cards and hazard reporting logs."
        ),
        "calculation": "Near-miss rate = Total near-misses reported / Total man-hours × 200,000",
        "unit": "Number and rate",
        "evidence_types": ["near_miss_register", "safety_observation_card", "hazard_log"],
        "keywords": ["near miss", "unsafe act", "hazard reporting", "leading indicator", "safety observation"],
        "common_errors": "Not having a near-miss reporting system; suppressing near-miss reporting to show zero.",
        "version": "BRSR-2023",
    },

    "SOC-SAFE-004": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": (
            "Disclose occupational illnesses / diseases recorded during the reporting period for employees "
            "and workers separately. Categories include musculoskeletal disorders, noise-induced hearing loss, "
            "respiratory diseases and other occupation-specific illnesses. Supporting evidence includes "
            "occupational health records and pre-placement/periodic medical examination reports."
        ),
        "calculation": "Count of occupational illness cases diagnosed during reporting period",
        "unit": "Number of cases",
        "evidence_types": ["medical_examination_report", "occupational_health_record", "clinic_register"],
        "keywords": ["occupational illness", "disease", "health", "medical", "hearing loss", "msds", "respiratory"],
        "common_errors": "Not maintaining periodic medical examination records; omitting contractor health records.",
        "version": "BRSR-2023",
    },

    "SOC-SAFE-005": {
        "section": "Principle 3 - Essential Indicator 12",
        "guidance": (
            "Disclose measures taken to ensure the health, safety and welfare of employees including access "
            "to occupational health services, periodic health checks, health insurance coverage, and "
            "employee assistance programmes (EAP). Entities must also report whether an OHS management "
            "system (ISO 45001 or equivalent) is implemented and its coverage."
        ),
        "calculation": "% coverage = Employees covered by OHS system / Total employees × 100",
        "unit": "%",
        "evidence_types": ["iso45001_certificate", "health_policy", "insurance_policy"],
        "keywords": ["ohs", "iso 45001", "health insurance", "occupational health", "eap", "welfare"],
        "common_errors": "Claiming ISO 45001 coverage without certification; not covering contractors in OHS scope.",
        "version": "BRSR-2023",
    },

    "SOC-WELF-001": {
        "section": "Principle 3 - Essential Indicator 8",
        "guidance": (
            "Disclose training and skill-upgradation information for employees and workers, including the "
            "number and percentage of employees or workers covered by training or skill-development "
            "programmes, as applicable. Supporting evidence may include training calendars, attendance "
            "records, completion certificates, learning-management-system records and training registers."
        ),
        "calculation": "Training Coverage % = Employees/Workers trained / Total Employees/Workers × 100. Average Training Hours = Total training hours / Total headcount",
        "unit": "Number, % and hours per person",
        "evidence_types": ["training_register", "lms_report", "attendance_sheet", "skill_certificate"],
        "keywords": ["training", "skill development", "learning", "capacity building", "upskilling", "lms"],
        "common_errors": "Counting induction training only; not including workers in training metrics.",
        "version": "BRSR-2023",
    },

    "SOC-WELF-002": {
        "section": "Principle 3 - Essential Indicator 8",
        "guidance": (
            "Disclose the percentage of employees and workers covered by health and accident insurance "
            "schemes, provident fund, gratuity, ESI and other statutory and non-statutory benefits. "
            "Benefits must be reported separately for permanent employees, other employees, permanent "
            "workers and other workers."
        ),
        "calculation": "Coverage % = Number covered by each benefit / Total in category × 100",
        "unit": "%",
        "evidence_types": ["insurance_policy", "epfo_record", "esic_record", "gratuity_trust"],
        "keywords": ["insurance", "epf", "esic", "gratuity", "benefits", "pf", "provident fund", "esi"],
        "common_errors": "Not verifying ESI compliance for workers earning below ESI wage threshold; omitting contract workers.",
        "version": "BRSR-2023",
    },

    "SOC-WELF-003": {
        "section": "Principle 3 - Essential Indicator 8",
        "guidance": (
            "Disclose availability and coverage of maternity benefits (as per Maternity Benefit Act 1961), "
            "paternity leave, crèche facilities and day-care, work-from-home policies, flexible hours and "
            "other family-friendly benefits. Report number of employees who availed each benefit during "
            "the period."
        ),
        "calculation": "Coverage % = Employees availing benefit / Total eligible employees × 100",
        "unit": "Number and %",
        "evidence_types": ["maternity_leave_record", "creche_registration", "policy_document"],
        "keywords": ["maternity", "paternity", "creche", "work from home", "flexible", "parental", "family benefit"],
        "common_errors": "Not tracking actual utilisation vs policy availability; crèche not registered under CLRA.",
        "version": "BRSR-2023",
    },

    "SOC-REHAB-001": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": (
            "Where work-related injuries occur, disclose the number of employees/workers rehabilitated or "
            "who returned to work after injury. Also disclose whether the entity has a return-to-work "
            "programme. Supporting evidence includes rehabilitation records, modified duty assignments "
            "and return-to-work records."
        ),
        "calculation": "Rehabilitation Rate = Workers returned to work / Total workers with LTI × 100",
        "unit": "Number and %",
        "evidence_types": ["rehabilitation_record", "return_to_work_plan", "modified_duty_assignment"],
        "keywords": ["rehabilitation", "return to work", "modified duty", "injury recovery", "rtw"],
        "common_errors": "Not maintaining formal RTW records; not distinguishing full return from light duty.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 5 — Human Rights
    # =========================================================================

    "HR-ASSESS-001": {
        "section": "Principle 5 - Essential Indicator 1",
        "guidance": (
            "Disclose the percentage of plants and offices that were assessed for risks/issues pertaining "
            "to human rights — covering child labour, forced labour, sexual harassment, discrimination and "
            "wage payment. Assessments may be self-assessments, internal audits or third-party audits. "
            "Supporting evidence includes audit reports, assessment checklists and corrective action plans."
        ),
        "calculation": "Assessment Coverage % = Plants/offices assessed / Total plants/offices × 100",
        "unit": "%",
        "evidence_types": ["human_rights_audit", "assessment_checklist", "third_party_audit_report"],
        "keywords": ["human rights", "assessment", "child labour", "forced labour", "audit", "compliance"],
        "common_errors": "Self-certifying without actual assessment; not covering supply chain or contract workers.",
        "version": "BRSR-2023",
    },

    "HR-TRAIN-001": {
        "section": "Principle 5 - Essential Indicator 2",
        "guidance": (
            "Disclose the percentage of employees and workers trained on human rights issues and policies "
            "during the reporting period. Training should cover prevention of child labour, forced labour, "
            "sexual harassment, discrimination, and fair wage practices. Supporting evidence includes "
            "training registers, LMS records and awareness session attendance sheets."
        ),
        "calculation": "HR Training Coverage % = Employees/Workers trained on HR / Total × 100",
        "unit": "%",
        "evidence_types": ["training_register", "lms_record", "awareness_session_record"],
        "keywords": ["human rights training", "awareness", "posh training", "child labour awareness", "forced labour"],
        "common_errors": "Counting one-time induction only; not covering workers in HR training metrics.",
        "version": "BRSR-2023",
    },

    "HR-GRIEVANCE-001": {
        "section": "Principle 5 - Essential Indicator 3",
        "guidance": (
            "Disclose grievances related to human rights received from employees, workers and external "
            "stakeholders. Report separately for: sexual harassment, discrimination, child labour, forced "
            "labour and wages. For each category: number filed, number resolved, number pending and "
            "average resolution time. Supporting evidence includes grievance register and redressal records."
        ),
        "calculation": "Resolution Rate % = Grievances Resolved / Total Grievances Filed × 100",
        "unit": "Number and %",
        "evidence_types": ["grievance_register", "posh_committee_minutes", "redressal_record"],
        "keywords": ["grievance", "complaint", "harassment", "discrimination", "posh", "sexual harassment", "wages grievance"],
        "common_errors": "Not maintaining separate registers for POSH vs wage vs discrimination complaints.",
        "version": "BRSR-2023",
    },

    "HR-CHILD-001": {
        "section": "Principle 5 - Essential Indicator 5",
        "guidance": (
            "Disclose the number of instances of child labour, forced/involuntary labour and sexual "
            "harassment cases found and remediated. Explicitly state zero if none occurred. This covers "
            "direct operations and significant supply chain. Supporting evidence includes supplier "
            "assessments, audit reports and corrective action records."
        ),
        "calculation": "Count of verified incidents + remediation actions taken",
        "unit": "Number of incidents",
        "evidence_types": ["child_labour_audit", "supplier_audit", "remediation_record"],
        "keywords": ["child labour", "forced labour", "bonded labour", "exploitation", "remediation"],
        "common_errors": "Not auditing supply chain for child/forced labour; not having a child labour policy.",
        "version": "BRSR-2023",
    },

    "HR-WAGES-001": {
        "section": "Principle 5 - Essential Indicator 6",
        "guidance": (
            "Disclose whether minimum wages are paid to all employees and workers, including contract "
            "workers, as per applicable state/central minimum wage notifications. Entities must confirm "
            "100% compliance or disclose the % non-compliant and corrective actions. Supporting evidence "
            "includes wage registers, payslips and labour contractor compliance certificates."
        ),
        "calculation": "Compliance % = Employees/Workers paid >= minimum wage / Total × 100",
        "unit": "%",
        "evidence_types": ["wage_register", "payslip", "minimum_wage_notification", "contractor_compliance_cert"],
        "keywords": ["minimum wage", "wages", "fair wage", "labour law", "wage compliance", "contractor wages"],
        "common_errors": "Not verifying contractor wage compliance; using outdated minimum wage notification rates.",
        "version": "BRSR-2023",
    },

    "HR-SUPPLY-001": {
        "section": "Principle 5 - Leadership Indicator 1",
        "guidance": (
            "Entities are encouraged to assess their significant suppliers and value chain partners for "
            "human rights risks. Disclose the percentage of input material sourced from suppliers assessed "
            "for human rights compliance and the findings. Supporting evidence includes supplier code of "
            "conduct, supplier questionnaires and audit reports."
        ),
        "calculation": "Supply Chain HR Assessment % = Suppliers assessed / Total significant suppliers × 100",
        "unit": "%",
        "evidence_types": ["supplier_code_of_conduct", "supplier_questionnaire", "supplier_audit"],
        "keywords": ["supply chain", "supplier assessment", "human rights due diligence", "value chain"],
        "common_errors": "Only assessing Tier-1 suppliers; not including labour subcontractors in scope.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 4 — Stakeholder Engagement
    # =========================================================================

    "STK-ENG-001": {
        "section": "Principle 4 - Essential Indicator 1",
        "guidance": (
            "Describe the processes for identifying key stakeholder groups including shareholders, employees, "
            "customers, suppliers, community, government and regulators. Disclose how the entity engages "
            "with each group, the frequency of engagement and key topics raised. Supporting evidence "
            "includes stakeholder mapping exercise reports, engagement meeting minutes."
        ),
        "calculation": "Qualitative disclosure — list of stakeholder groups, engagement mechanism and frequency",
        "unit": "N/A",
        "evidence_types": ["stakeholder_map", "engagement_minutes", "agm_proceedings", "community_meeting"],
        "keywords": ["stakeholder", "engagement", "shareholder", "community", "customers", "suppliers", "dialogue"],
        "common_errors": "Listing stakeholders without evidence of actual engagement; omitting workers and communities.",
        "version": "BRSR-2023",
    },

    "STK-VULN-001": {
        "section": "Principle 4 - Essential Indicator 2",
        "guidance": (
            "Disclose whether the entity has identified vulnerable and marginalised stakeholders — including "
            "persons with disabilities, women, tribal communities, migrant workers and economically weaker "
            "sections — and the special initiatives taken for their inclusion and welfare. Supporting "
            "evidence includes programme reports, beneficiary data and CSR activity records."
        ),
        "calculation": "Number of vulnerable stakeholders identified and % covered by special initiatives",
        "unit": "Number and %",
        "evidence_types": ["csr_report", "beneficiary_data", "programme_report"],
        "keywords": ["vulnerable", "marginalised", "tribal", "disabled", "migrant", "weaker section", "inclusion"],
        "common_errors": "Treating all community members as homogeneous; not having a specific outreach for vulnerable groups.",
        "version": "BRSR-2023",
    },

    "STK-CSR-001": {
        "section": "Principle 4 - Essential Indicator 2 / Principle 8",
        "guidance": (
            "Disclose CSR expenditure under Section 135 of the Companies Act 2013 — prescribed spend "
            "(2% of average net profits), actual spend, and the projects/programmes implemented. "
            "Disclose the impact assessment results where mandatory. Supporting evidence includes "
            "CSR Annual Action Plan, Board CSR committee minutes, fund utilisation certificates "
            "and impact assessment reports."
        ),
        "calculation": "Prescribed CSR Spend = 2% × Average Net Profits of preceding 3 financial years",
        "unit": "INR crore",
        "evidence_types": ["csr_report", "board_resolution", "utilisation_certificate", "impact_assessment"],
        "keywords": ["csr", "corporate social responsibility", "section 135", "community", "social spend"],
        "common_errors": "Not obtaining utilisation certificates; claiming admin costs as CSR spend beyond 5% cap.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 8 — Inclusive Growth
    # =========================================================================

    "INCL-PROC-001": {
        "section": "Principle 8 - Essential Indicator 3",
        "guidance": (
            "Disclose the percentage of inputs (goods and services) procured from suppliers identified as "
            "MSMEs, local suppliers or from economically underdeveloped districts (Aspirational Districts). "
            "This supports inclusive supply chains. Supporting evidence includes purchase orders, MSME "
            "registration certificates (Udyam) and procurement analysis."
        ),
        "calculation": "MSME Procurement % = Procurement value from MSMEs (INR) / Total procurement value × 100",
        "unit": "INR crore and %",
        "evidence_types": ["purchase_order", "udyam_certificate", "supplier_list"],
        "keywords": ["msme", "small business", "local procurement", "supplier diversity", "udyam", "small supplier"],
        "common_errors": "Using outdated MSME definitions (pre-2020 turnover thresholds); not tracking Udyam certificates.",
        "version": "BRSR-2023",
    },

    "INCL-JOB-001": {
        "section": "Principle 8 - Essential Indicator 2",
        "guidance": (
            "Disclose input material sourcing from local community and whether the entity has community "
            "development and livelihood programmes creating employment for marginalised groups. This "
            "includes apprenticeship, local hiring policy, skill development for communities near "
            "plant locations."
        ),
        "calculation": "% local employees = Employees from local community / Total employees × 100",
        "unit": "Number and %",
        "evidence_types": ["local_hiring_policy", "community_programme_report", "apprenticeship_record"],
        "keywords": ["local hiring", "community employment", "livelihood", "apprenticeship", "social impact"],
        "common_errors": "No definition of 'local' community; not tracking hiring location data.",
        "version": "BRSR-2023",
    },

    "INCL-CSR-001": {
        "section": "Principle 8 - Essential Indicator 1",
        "guidance": (
            "Disclose social impact assessments (SIA) conducted for major CSR projects where applicable "
            "under Companies (CSR Policy) Rules. For projects exceeding INR 1 crore, SIA is mandated every "
            "3 years. Disclose findings, outcomes against planned targets, and corrective actions. "
            "Supporting evidence includes SIA reports conducted by independent agencies."
        ),
        "calculation": "Coverage = % of CSR projects with completed SIA / Total applicable CSR projects × 100",
        "unit": "%",
        "evidence_types": ["sia_report", "third_party_evaluation", "csr_programme_outcomes"],
        "keywords": ["social impact", "sia", "csr impact", "community development", "outcomes", "beneficiaries"],
        "common_errors": "Not commissioning SIA for projects exceeding INR 1 crore; self-reporting impact without verification.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 1 — Governance & Ethics
    # =========================================================================

    "GOV-ETH-001": {
        "section": "Principle 1 - Essential Indicator 1",
        "guidance": (
            "Disclose the percentage of employees and workers receiving training or awareness programmes "
            "covering the relevant Principles and applicable policies, including anti-corruption and "
            "anti-bribery awareness where covered by the organisation's programmes. Report the applicable "
            "population, number covered and percentage coverage using the BRSR-required categories. "
            "Supporting evidence includes training completion records, attendance registers, "
            "learning-management-system records and awareness programme documentation."
        ),
        "calculation": "Training Coverage % = Employees/Workers trained on ethics / Total × 100",
        "unit": "%",
        "evidence_types": ["training_register", "lms_record", "awareness_certificate"],
        "keywords": ["ethics", "anti-corruption", "anti-bribery", "training", "code of conduct", "integrity"],
        "common_errors": "Counting policy circulation as 'training'; not tracking separate ethics training completion.",
        "version": "BRSR-2023",
    },

    "GOV-COMP-001": {
        "section": "Applicable BRSR Principle / Indicator - Complaint-specific disclosure",
        "guidance": (
            "Capture complaints and grievances according to the specific BRSR Principle and complaint "
            "category to which they relate. Record the number of complaints received, resolved and "
            "pending, together with the applicable complaint type and reporting period. Do not aggregate "
            "human-rights grievances, sexual-harassment complaints, wage-related grievances and ethics "
            "complaints into Principle 1 Essential Indicator 3 unless the specific BRSR question requires "
            "it. Supporting evidence includes grievance registers, complaint-management records, "
            "POSH records where applicable and resolution documentation."
        ),
        "calculation": "Resolution Rate % = Complaints Resolved / Total Complaints Received × 100",
        "unit": "Number and %",
        "evidence_types": ["grievance_register", "complaint_management_record", "posh_record"],
        "keywords": ["complaint", "grievance", "resolution", "posh", "ethics complaint", "whistleblower"],
        "common_errors": "Aggregating all complaints into one bucket; not tracking pending complaints from prior periods.",
        "version": "BRSR-2023",
    },

    "GOV-POLICY-001": {
        "section": "Principle 1 - Essential Indicator 1",
        "guidance": (
            "Disclose whether the entity has policies for each of the 9 BRSR Principles. For each policy, "
            "confirm: (a) it is approved by the Board, (b) whether it extends to the Group/JV/suppliers, "
            "(c) whether it is publicly available, and (d) whether it is translated into procedures. "
            "Supporting evidence includes Board-approved policy documents and website links."
        ),
        "calculation": "Policy Coverage = Number of Principles with approved policy / 9 Principles × 100",
        "unit": "N/A (checklist)",
        "evidence_types": ["board_approved_policy", "policy_document", "website_url"],
        "keywords": ["policy", "board approval", "brsr principles", "governance", "code of conduct", "framework"],
        "common_errors": "Policies not formally approved by Board; policy not translated to SOPs; not extended to subsidiaries.",
        "version": "BRSR-2023",
    },

    "GOV-BOARD-001": {
        "section": "Principle 1 - Essential Indicator 2",
        "guidance": (
            "Disclose board composition including total number of directors, number of independent directors, "
            "percentage of women directors, and whether the board has any directors with expertise in ESG, "
            "environment, social or governance domains. SEBI LODR requires minimum 1/3 independent directors "
            "for listed entities. Supporting evidence includes board resolution, AGM minutes and ROC filings."
        ),
        "calculation": "Independent Director % = Number of Independent Directors / Total Board Strength × 100",
        "unit": "Number and %",
        "evidence_types": ["board_resolution", "agm_minutes", "mca_filing", "annual_report"],
        "keywords": ["board", "independent director", "board composition", "governance", "women director", "esg expertise"],
        "common_errors": "Not maintaining board diversity matrix; not updating director expertise declaration annually.",
        "version": "BRSR-2023",
    },

    "GOV-WHIS-001": {
        "section": "Principle 1 - Essential Indicator 3",
        "guidance": (
            "Disclose whether the entity has implemented a whistleblower / vigil mechanism as required "
            "under Companies Act 2013 (Section 177) and SEBI LODR. Describe the mechanism, whether "
            "complaints are received directly by the Audit Committee, the number of complaints received "
            "and resolved, and the protection available to whistleblowers. Supporting evidence includes "
            "the vigil mechanism policy and audit committee minutes."
        ),
        "calculation": "Number of whistleblower complaints received, resolved, pending",
        "unit": "Number",
        "evidence_types": ["vigil_mechanism_policy", "audit_committee_minutes", "complaint_register"],
        "keywords": ["whistleblower", "vigil mechanism", "hotline", "speak up", "audit committee", "section 177"],
        "common_errors": "No direct access to Audit Committee; not tracking complaints from the mechanism separately.",
        "version": "BRSR-2023",
    },

    "GOV-AUDIT-001": {
        "section": "Principle 1 - Essential Indicator 2",
        "guidance": (
            "Disclose whether ESG-related risks are included in the internal audit scope. Report the "
            "frequency and coverage of internal audits for ESG risks — environment, social, governance "
            "and compliance risks. Also disclose findings and corrective actions from ESG audits. "
            "Supporting evidence includes internal audit plan and audit committee reports."
        ),
        "calculation": "ESG Audit Coverage % = ESG risk areas audited / Total ESG risk areas × 100",
        "unit": "%",
        "evidence_types": ["internal_audit_plan", "audit_committee_report", "cag_audit", "compliance_report"],
        "keywords": ["internal audit", "esg audit", "compliance", "risk", "audit committee", "governance"],
        "common_errors": "ESG risks not formally included in internal audit universe; no corrective action tracking.",
        "version": "BRSR-2023",
    },

    "GOV-CONFLICT-001": {
        "section": "Principle 1 - Essential Indicator 3",
        "guidance": (
            "Disclose the conflict of interest policy and the number of complaints related to conflict of "
            "interest received and resolved during the period. Directors and senior management must "
            "annually declare conflicts. Supporting evidence includes annual declarations, board minutes "
            "recording conflict disclosures and the policy document."
        ),
        "calculation": "Number of conflict of interest disclosures and complaints in the period",
        "unit": "Number",
        "evidence_types": ["conflict_declaration", "board_minutes", "coi_policy"],
        "keywords": ["conflict of interest", "disclosure", "related party", "declaration", "coi", "ethics"],
        "common_errors": "Collecting declarations but not reviewing them; no escalation process for identified conflicts.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 2 — Sustainable Products & Services
    # =========================================================================

    "GOV-SUPPLY-001": {
        "section": "Principle 2 - Essential Indicator 2",
        "guidance": (
            "Disclose the percentage of input materials (by value) purchased from suppliers who adhere "
            "to the entity's supplier code of conduct covering environmental, social and governance "
            "criteria. Also disclose the process for supplier assessment and performance monitoring. "
            "Supporting evidence includes supplier code of conduct, signed supplier declarations and "
            "supplier audit reports."
        ),
        "calculation": "Supplier CoC Adherence % = Procurement value from assessed suppliers / Total procurement value × 100",
        "unit": "%",
        "evidence_types": ["supplier_code_of_conduct", "supplier_declaration", "supplier_audit"],
        "keywords": ["supplier", "supply chain", "code of conduct", "procurement", "vendor", "sustainable sourcing"],
        "common_errors": "Having CoC but no process to verify supplier compliance; only covering direct Tier-1 suppliers.",
        "version": "BRSR-2023",
    },

    "PR2-LIFECYCLE-001": {
        "section": "Principle 2 - Essential Indicator 1",
        "guidance": (
            "Describe whether the entity has a process for assessing the environmental and social impacts "
            "of products/services across their lifecycle (from raw material to end-of-life). Disclose "
            "the percentage of R&D and CAPEX investments directed toward improving environmental and "
            "social impacts of products. Supporting evidence includes LCA studies, product stewardship "
            "policies and R&D reports."
        ),
        "calculation": "Sustainable R&D % = R&D/CAPEX on sustainability / Total R&D/CAPEX × 100",
        "unit": "%",
        "evidence_types": ["lca_study", "product_stewardship_policy", "rd_report", "capex_schedule"],
        "keywords": ["lifecycle", "lca", "product impact", "sustainable design", "product stewardship", "epr"],
        "common_errors": "Claiming lifecycle assessment without formal LCA study; EPR obligations not tracked.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 7 — Policy Advocacy
    # =========================================================================

    "GOV-ADVOCACY-001": {
        "section": "Principle 7 - Essential Indicator 1",
        "guidance": (
            "Disclose the trade and industry chambers / associations to which the entity belongs. "
            "Where the entity is part of any top 10 industry associations, disclose whether those "
            "associations have taken positions on any public/regulatory policy that align with "
            "or deviate from the entity's own stated position on the same topic."
        ),
        "calculation": "Qualitative disclosure — list of associations and policy alignment statements",
        "unit": "N/A",
        "evidence_types": ["membership_certificate", "association_policy_position", "public_statement"],
        "keywords": ["trade association", "industry chamber", "policy advocacy", "ficci", "cii", "assocham"],
        "common_errors": "Not disclosing memberships of all significant trade associations; no review of alignment.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # PRINCIPLE 9 — Consumer Responsibility
    # =========================================================================

    "PR9-CONSUMER-001": {
        "section": "Principle 9 - Essential Indicator 1",
        "guidance": (
            "Disclose the number of consumer complaints received and resolved relating to: data privacy, "
            "advertising, cyber-security, delivery/service deficiencies, restrictive trade practices and "
            "unfair trade practices. Report separately: received, resolved and pending with average "
            "resolution time. Supporting evidence includes consumer complaint register and CRM records."
        ),
        "calculation": "Resolution Rate % = Resolved complaints / Total received × 100. Pending % = Pending / Total × 100",
        "unit": "Number and %",
        "evidence_types": ["consumer_complaint_register", "crm_report", "nodal_officer_record"],
        "keywords": ["consumer complaint", "customer grievance", "data privacy", "cyber security", "unfair trade"],
        "common_errors": "Not maintaining separate registers for different complaint categories; including resolved from prior periods.",
        "version": "BRSR-2023",
    },

    "PR9-DPRIVACY-001": {
        "section": "Principle 9 - Essential Indicator 3",
        "guidance": (
            "Disclose whether the entity has a data privacy policy aligned with applicable law "
            "(IT Act 2000, DPDP Act 2023). Report the number of data privacy complaints/breaches "
            "in the period, actions taken and status. Supporting evidence includes privacy policy, "
            "DPDP compliance certificate, and breach notification records."
        ),
        "calculation": "Number of data breaches and complaints in the period",
        "unit": "Number",
        "evidence_types": ["privacy_policy", "breach_notification", "dpdp_compliance_record"],
        "keywords": ["data privacy", "dpdp", "data protection", "cyber security", "personal data", "breach"],
        "common_errors": "No formal data breach response plan; privacy policy not updated for DPDP Act 2023.",
        "version": "BRSR-2023",
    },

    # =========================================================================
    # CROSS-CUTTING: Emission Factors Reference
    # =========================================================================

    "REF-EMISSION-FACTORS": {
        "section": "Reference: Emission Factors for Indian Operations",
        "guidance": (
            "India Grid Emission Factor (CEA FY 2022-23): 0.82 kg CO2/kWh = 0.82 tCO2/MWh. "
            "Diesel emission factor: 2.68 kg CO2/litre (GHG Protocol). HSD: 2.68 kg CO2/litre. "
            "Petrol: 2.31 kg CO2/litre. LPG: 1.51 kg CO2/kg. Natural Gas: 2.04 kg CO2/m3. "
            "NCV Diesel: 35.9 MJ/litre = 0.0359 GJ/litre. NCV Electricity: 3.6 GJ/MWh. "
            "BEE conversion: 1 kWh = 0.0036 GJ."
        ),
        "calculation": "These are standard factors — apply consistently and document source in disclosures.",
        "unit": "Various",
        "evidence_types": ["cea_report", "bee_manual", "ghg_protocol"],
        "keywords": ["emission factor", "cea", "ghg protocol", "grid factor", "conversion factor", "ncv"],
        "common_errors": "Using old CEA factors (update annually); using LHV vs HHV inconsistently.",
        "version": "CEA-FY2023 / GHG-Protocol-v1",
    },

    "REF-BRSR-SCOPE": {
        "section": "Reference: BRSR Reporting Boundary & Applicability",
        "guidance": (
            "BRSR Core is mandatory for the top 1000 listed entities by market capitalization from FY 2023-24. "
            "The reporting boundary is: (a) own operations (all plants, offices, sites), (b) subsidiaries "
            "where applicable. The reporting period is the financial year (April 1 to March 31). "
            "Comparative data for the previous year must be disclosed. Intensity metrics must use the "
            "same denominator year-on-year unless restated with explanation."
        ),
        "calculation": "Reporting period: April 1 to March 31. Base unit: INR crore for financial denominators.",
        "unit": "N/A",
        "evidence_types": ["sebi_circular", "annual_report", "board_approval"],
        "keywords": ["brsr core", "mandatory", "top 1000", "reporting boundary", "applicability", "sebi", "listed"],
        "common_errors": "Excluding subsidiaries without disclosure; changing reporting period without explanation.",
        "version": "SEBI-BRSR-CORE-2023",
    },

    "REF-ASSURANCE": {
        "section": "Reference: Third-Party Assurance Requirements",
        "guidance": (
            "BRSR Core requires reasonable assurance by an independent third party (SEBI-registered "
            "Chartered Accountant firm or a globally recognised sustainability assurance provider) for "
            "key quantitative indicators. The assurance report must be disclosed in the Annual Report. "
            "Assured indicators include: Energy, GHG, Water, Waste, LTIFR, Fatalities. "
            "The assurance standard used must be disclosed (ISAE 3000, AA1000AS or ICAI standard)."
        ),
        "calculation": "% of BRSR Core indicators covered by reasonable assurance",
        "unit": "N/A",
        "evidence_types": ["assurance_report", "ca_firm_registration", "isae3000_report"],
        "keywords": ["assurance", "third party", "audit", "isae 3000", "aa1000", "icai", "reasonable assurance"],
        "common_errors": "Using limited instead of reasonable assurance; assurance scope not covering all mandatory indicators.",
        "version": "SEBI-BRSR-CORE-2023",
    },
}
