import os

target = os.path.join("app", "modules", "reporting", "brsr_generator.py")

with open(target, "a", encoding="utf-8") as f:
    f.write('''
    # Section C HTML - Principles 7 to 9 & Assurance Statement
    sec_c_p7_to_end_html = f"""
    <!-- PRINCIPLE 7 -->
    <div class="principle-banner">Principle 7: Businesses, when engaging in influencing public and regulatory policy, should do so in a manner that is responsible and transparent</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>
    <div class="question-text">1. Number of affiliations with trade and industry chambers: <b>63</b></div>
    <div style="font-size: 8.8pt;">Top affiliations include: Confederation of Indian Industry (CII), FICCI, National Safety Council (NSC), ASSOCHAM, CIDC, and British Safety Council.</div>
    <div class="question-text">2. Anti-competitive conduct: <b>No adverse orders or proceedings during the year.</b></div>

    <!-- PRINCIPLE 8 -->
    <div class="principle-banner">Principle 8: Businesses should promote inclusive growth and equitable development</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">4. Percentage of input material sourced from suppliers:</div>
    <table>
        <thead>
            <tr><th>Parameter</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td>Directly sourced from MSMEs / small producers</td>{render_num_cell(derived.get('msme_purchases_pct', 11.0), 'CALC-DERIVED-MSME-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(10.0, 'SRC-MSME-PREV', entity_id, period_id, decimals=1, is_pct=True)}</tr>
            <tr><td>Directly from within India</td>{render_num_cell(64.0, 'SRC-IND-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(70.0, 'SRC-IND-PREV', entity_id, period_id, decimals=1, is_pct=True)}</tr>
        </tbody>
    </table>

    <div class="question-text">5. Job creation in smaller towns (RBI Classification System):</div>
    <table>
        <thead>
            <tr><th>Location Categorisation</th><th class="th-current-yr">{curr_yr_lbl} (Salaries)</th><th class="th-prev-yr">{prev_yr_lbl} (Salaries)</th></tr>
        </thead>
        <tbody>
            <tr><td>Rural</td>{render_num_cell(7.0, 'JOB-RUR', entity_id, period_id, is_pct=True)}{render_num_cell(10.0, 'JOB-RUR-P', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Semi-Urban areas</td>{render_num_cell(3.0, 'JOB-SEMI', entity_id, period_id, is_pct=True)}{render_num_cell(6.0, 'JOB-SEMI-P', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Urban areas</td>{render_num_cell(4.0, 'JOB-URB', entity_id, period_id, is_pct=True)}{render_num_cell(4.0, 'JOB-URB-P', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Metropolitan area</td>{render_num_cell(86.0, 'JOB-METRO', entity_id, period_id, is_pct=True)}{render_num_cell(80.0, 'JOB-METRO-P', entity_id, period_id, is_pct=True)}</tr>
        </tbody>
    </table>

    <div class="indicator-type-heading">LEADERSHIP INDICATORS</div>
    <div class="question-text">5. Details of beneficiaries of CSR Projects:</div>
    <table>
        <thead>
            <tr><th>S. No.</th><th>CSR Project</th><th style="text-align:right;">Persons Benefitted</th><th style="text-align:right;">% Vulnerable / Marginalized</th></tr>
        </thead>
        <tbody>
            <tr><td>1</td><td>Construction Skills Training Institutes for youth</td>{render_num_cell(16685, 'CSR-BEN-1', entity_id, period_id)}{render_num_cell(100.0, 'CSR-BEN-P1', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>2</td><td>Enhancing educational infrastructure in Schools</td>{render_num_cell(142411, 'CSR-BEN-2', entity_id, period_id)}{render_num_cell(100.0, 'CSR-BEN-P2', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>3</td><td>STEM Education and digital kits</td>{render_num_cell(118008, 'CSR-BEN-3', entity_id, period_id)}{render_num_cell(100.0, 'CSR-BEN-P3', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>4</td><td>Water conservation & rural community development</td>{render_num_cell(69552, 'CSR-BEN-4', entity_id, period_id)}{render_num_cell(100.0, 'CSR-BEN-P4', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>5</td><td>Environment conservation initiatives</td>{render_num_cell(795097, 'CSR-BEN-5', entity_id, period_id)}{render_num_cell(100.0, 'CSR-BEN-P5', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>6</td><td>Community health & medical van consultations</td>{render_num_cell(798848, 'CSR-BEN-6', entity_id, period_id)}{render_num_cell(100.0, 'CSR-BEN-P6', entity_id, period_id, is_pct=True)}</tr>
            <tr class="row-total"><td></td><td>Total Beneficiaries</td>{render_num_cell(1940601, 'CSR-BEN-TOT', entity_id, period_id, bold=True)}{render_num_cell(100.0, 'CSR-BEN-PTOT', entity_id, period_id, is_pct=True, bold=True)}</tr>
        </tbody>
    </table>

    <!-- PRINCIPLE 9 -->
    <div class="principle-banner">Principle 9: Businesses should engage with and provide value to their consumers in a responsible manner</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">3. Number of consumer complaints in respect of data privacy & cybersecurity:</div>
    <table>
        <thead>
            <tr><th>Particulars</th><th class="th-current-yr">{curr_yr_lbl} Received</th><th class="th-current-yr">{curr_yr_lbl} Pending</th><th class="th-prev-yr">{prev_yr_lbl} Received</th><th class="th-prev-yr">{prev_yr_lbl} Pending</th></tr>
        </thead>
        <tbody>
            <tr><td>Data privacy</td>{render_num_cell(0, 'CP-DP-C', entity_id, period_id)}{render_num_cell(0, 'CP-DP-P', entity_id, period_id)}{render_num_cell(0, 'CP-DP-C-P', entity_id, period_id)}{render_num_cell(0, 'CP-DP-P-P', entity_id, period_id)}</tr>
            <tr><td>Cyber-security</td>{render_num_cell(0, 'CP-CS-C', entity_id, period_id)}{render_num_cell(0, 'CP-CS-P', entity_id, period_id)}{render_num_cell(0, 'CP-CS-C-P', entity_id, period_id)}{render_num_cell(0, 'CP-CS-P-P', entity_id, period_id)}</tr>
            <tr><td>Delivery of essential services</td>{render_num_cell(0, 'CP-ES-C', entity_id, period_id)}{render_num_cell(0, 'CP-ES-P', entity_id, period_id)}{render_num_cell(0, 'CP-ES-C-P', entity_id, period_id)}{render_num_cell(0, 'CP-ES-P-P', entity_id, period_id)}</tr>
        </tbody>
    </table>
    <div class="question-text">4 & 7. Product recalls and data breaches:</div>
    <div style="font-size: 8.8pt;">Product recalls: <b>Zero</b> (voluntary or forced) &bull; Customer data breaches involving personally identifiable information: <b>Zero</b> instances.</div>

    <!-- BACK MATTER: ASSURANCE STATEMENT & APPENDIX -->
    <div class="section-strip" style="page-break-before: always; break-before: always;">INDEPENDENT REASONABLE ASSURANCE STATEMENT</div>
    <div style="font-size: 8.8pt; line-height: 1.5; color: #334155;">
        <p>To,<br/><b>{entity_name}</b><br/>L&T House, Ballard Estate, Mumbai 400 001, Maharashtra</p>
        <p><b>Independent Assurance Statement to {entity_name} on select non-financial sustainability disclosures in the Business Responsibility and Sustainability Report for the financial year {fy}.</b></p>
        <p><b>Introduction and objective:</b> {assurance.get('provider_name', 'BDO India Services Private Limited')} was engaged by the Company to provide independent reasonable assurance on BRSR Core indicators of the Report for the period 1st April 2025 through 31st March 2026.</p>
        <p><b>Assurance standard:</b> We conducted our assurance engagement in accordance with International Standard on Assurance Engagements (ISAE) 3000 (Revised) and ISAE 3410, applying the criteria of <b>'Reasonable'</b> assurance.</p>
        <p><b>Scope & boundary of assurance:</b> We have assured non-financial information of the BRSR Core indicators pertaining to the Company's performance for the period. Verification was conducted across operating manufacturing facilities, EPC project sites, and corporate headquarters.</p>
        <p><b>Our conclusion:</b> Based on the scope of our review, we conclude that the non-financial sustainability disclosures fulfil the criteria of relevance, completeness, reliability, neutrality, and understandability as per the 'reasonable' assurance criteria of the applied standard.</p>
        <p style="margin-top: 14px;"><b>For {assurance.get('provider_name', 'BDO India Services Private Limited')}</b><br/>
        {assurance.get('lead_auditor', 'Indra Guha')}<br/>
        Partner | Sustainability & ESG Business Advisory Services<br/>
        Date: 11th May 2026</p>
    </div>

    <div class="sub-header" style="margin-top: 20px;">APPENDIX 1: BRSR CORE ASSURED INDICATORS</div>
    <table>
        <thead>
            <tr><th>Sr. No.</th><th>Principle / Reference</th><th>Attribute</th><th>Parameter</th></tr>
        </thead>
        <tbody>
            <tr><td>1</td><td>Principle 6 - E7</td><td>Green-house gas (GHG) footprint</td><td>Total Scope 1, Total Scope 2, GHG Emission Intensity</td></tr>
            <tr><td>2</td><td>Principle 6 - E3, E4</td><td>Water footprint</td><td>Total water consumption, Water consumption intensity, Water discharge</td></tr>
            <tr><td>3</td><td>Principle 6 - E1</td><td>Energy footprint</td><td>Total energy consumed (% from renewables), Energy intensity</td></tr>
            <tr><td>4</td><td>Principle 6 - E9</td><td>Embracing circularity</td><td>Total waste generated, Waste intensity, Waste recovered, Waste disposed</td></tr>
            <tr><td>5</td><td>Principle 3 - E1(C), E11</td><td>Enhancing employee wellbeing & safety</td><td>Spending on wellbeing measures, Details of safety related incidents (LTIFR)</td></tr>
            <tr><td>6</td><td>Principle 5 - E3(b), E7</td><td>Enabling Gender Diversity in Business</td><td>Complaints on POSH, Gross wages paid to females as % of wages paid</td></tr>
            <tr><td>7</td><td>Principle 8 - E4, E5</td><td>Enabling Inclusive Development</td><td>Input material sourced from MSMEs and India, Job creation in smaller towns</td></tr>
            <tr><td>8</td><td>Principle 9 - E7, P1 - E8</td><td>Fairness with Customers & Suppliers</td><td>Incidents of customer data loss, Number of days of accounts payable</td></tr>
            <tr><td>9</td><td>Principle 1 - E9</td><td>Open-ness of business</td><td>Concentration of purchases, Sales to dealers, Related party transactions</td></tr>
        </tbody>
    </table>
    """

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <title>SEBI BRSR Statutory Report - {entity_name} ({fy})</title>
    <style>
        {get_report_css()}
    </style>
</head>
<body>
    {completeness_html}
    {sec_a_html}
    {sec_b_html}
    {sec_c_p1_to_p6_html}
    {sec_c_p7_to_end_html}
</body>
</html>"""
    return full_html
''')
print("append_html_part4 written")
