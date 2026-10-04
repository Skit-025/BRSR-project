"""
E3 Engine: BRSR Knowledge Store
Contains the authoritative pre-indexed guidance excerpts for all 12 MVP indicators.
Guidance text verified against SEBI BRSR Guidance Note (2023) - ChatGPT-verified version.
"""

BRSR_KNOWLEDGE_BASE = {
    "ENV-ENERGY-001": {
        "section": "Principle 6 - Essential Indicator 1",
        "guidance": "Disclose total energy consumption in gigajoules (GJ), including energy consumed from non-renewable and renewable sources. The disclosure should cover relevant fuel consumption and purchased or self-generated electricity, heating, cooling or steam, as applicable. Supporting evidence may include electricity bills, DISCOM invoices, fuel purchase records, meter readings and energy logs.",
        "version": "BRSR-2023"
    },
    "ENV-ENERGY-002": {
        "section": "Principle 6 - Essential Indicator 1",
        "guidance": "Capture fuel consumption used in the reporting period, including diesel, petrol, natural gas and other applicable fuels, with quantities recorded in the relevant physical units and converted to gigajoules (GJ) using documented conversion factors. Supporting evidence may include fuel invoices, vendor delivery challans, fuel registers, vehicle or equipment logbooks and storage records.",
        "version": "BRSR-2023"
    },
    "ENV-GHG-001": {
        "section": "Principle 6 - Essential Indicator 3",
        "guidance": "Disclose Scope 1 greenhouse gas emissions arising from sources owned or controlled by the company, including stationary combustion and mobile combustion where applicable. Report emissions in metric tonnes of CO2 equivalent (tCO2e) using an appropriate and documented emission-factor methodology. Supporting evidence should include fuel consumption records, emission-factor sources and calculation workings.",
        "version": "BRSR-2023"
    },
    "ENV-GHG-002": {
        "section": "Principle 6 - Essential Indicator 3",
        "guidance": "Disclose Scope 2 greenhouse gas emissions arising from the consumption of purchased or acquired electricity, heating, cooling or steam, as applicable. Report emissions in metric tonnes of CO2 equivalent (tCO2e) using the applicable documented grid or supplier emission factors and methodology. Supporting evidence should include electricity consumption records, DISCOM invoices and emission-factor calculations.",
        "version": "BRSR-2023"
    },
    "ENV-WATER-001": {
        "section": "Principle 6 - Essential Indicator 2",
        "guidance": "Disclose water withdrawal by source, including surface water, groundwater, third-party water and other applicable sources, in kilolitres (kL). Separately capture water consumption and water discharge, where applicable. Supporting evidence may include water meter readings, groundwater records, municipal or third-party water invoices, tanker records and discharge monitoring records.",
        "version": "BRSR-2023"
    },
    "ENV-WASTE-001": {
        "section": "Principle 6 - Essential Indicator 4",
        "guidance": "Disclose waste generated during the reporting period in metric tonnes, with relevant waste categories and disposal or recovery methods. The disclosure should distinguish applicable hazardous and non-hazardous waste streams and report quantities handled through recycling, reuse, recovery, disposal or other applicable methods. Supporting evidence may include waste registers, authorised waste-handler records, disposal manifests, weighbridge slips and certificates of recycling or disposal.",
        "version": "BRSR-2023"
    },
    "SOC-SAFE-001": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": "Disclose applicable work-related safety incidents and injury metrics for employees and workers, including lost-time injuries where applicable. LTIFR may be calculated as (Number of Lost Time Injuries × 1,000,000) / Total Man-hours Worked, with employees and workers reported separately where required. Supporting evidence may include incident registers, occupational health and safety records, attendance or man-hour records and statutory safety reports.",
        "version": "BRSR-2023"
    },
    "SOC-SAFE-002": {
        "section": "Principle 3 - Essential Indicator 11",
        "guidance": "Disclose work-related fatalities separately for employees and workers and explicitly report zero where no fatalities occurred during the reporting period. Supporting evidence may include statutory registers, incident investigation reports, occupational safety records, employee or worker records and other applicable compliance documentation.",
        "version": "BRSR-2023"
    },
    "SOC-EMP-001": {
        "section": "Principle 3 - Essential Indicator 2",
        "guidance": "Disclose the total number of employees and workers, with applicable classification by gender and employment category, including permanent and other applicable categories. Where required, separately disclose information relating to employees or workers with disabilities. Figures should correspond to the reporting-period end date and applicable BRSR classification.",
        "version": "BRSR-2023"
    },
    "SOC-WELF-001": {
        "section": "Principle 3 - Essential Indicator 8",
        "guidance": "Disclose training and skill-upgradation information for employees and workers, including the number and percentage of employees or workers covered by training or skill-development programmes, as applicable. Supporting evidence may include training calendars, attendance records, completion certificates, learning-management-system records and training registers.",
        "version": "BRSR-2023"
    },
    "GOV-ETH-001": {
        "section": "Principle 1 - Essential Indicator 1",
        "guidance": "Disclose the percentage of employees and workers receiving training or awareness programmes covering the relevant Principles and applicable policies, including anti-corruption and anti-bribery awareness where covered by the organisation's programmes. Report the applicable population, number covered and percentage coverage using the BRSR-required categories. Supporting evidence includes training completion records, attendance registers, learning-management-system records and awareness programme documentation.",
        "version": "BRSR-2023"
    },
    "GOV-COMP-001": {
        "section": "Applicable BRSR Principle / Indicator - Complaint-specific disclosure",
        "guidance": "Capture complaints and grievances according to the specific BRSR Principle and complaint category to which they relate. Record the number of complaints received, resolved and pending, together with the applicable complaint type and reporting period. Do not aggregate human-rights grievances, sexual-harassment complaints, wage-related grievances and ethics complaints into Principle 1 Essential Indicator 3 unless the specific BRSR question requires it. Supporting evidence includes grievance registers, complaint-management records, POSH records where applicable and resolution documentation.",
        "version": "BRSR-2023"
    },
}
