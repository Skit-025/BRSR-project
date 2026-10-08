import os

target = os.path.join("app", "modules", "reporting", "brsr_generator.py")

with open(target, "a", encoding="utf-8") as f:
    f.write('''
    # Section C HTML - Principles 1 to 6
    sec_c_p1_to_p6_html = f"""
    <div class="section-strip" style="page-break-before: always; break-before: always;">SECTION C: PRINCIPLE WISE PERFORMANCE DISCLOSURE</div>

    <!-- PRINCIPLE 1 -->
    <div class="principle-banner">Principle 1: Businesses should conduct and govern themselves with integrity and in a manner that is ethical, transparent and accountable.</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">1. Percentage coverage by training and awareness programmes on any of the Principles during the financial year:</div>
    <table>
        <thead>
            <tr><th>Segment</th><th style="text-align:right;">Total number of programmes</th><th>Topics / principles covered</th><th style="text-align:right;">% of persons covered</th></tr>
        </thead>
        <tbody>
            <tr><td>Board of Directors</td>{render_num_cell(8, 'TRN-BOD-NUM', entity_id, period_id)}<td>Business overview, strategy, ESG risk, regulations</td>{render_num_cell(98, 'TRN-BOD-COV', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Key Managerial Personnel</td>{render_num_cell(31, 'TRN-KMP-NUM', entity_id, period_id)}<td>Compliance, ESG regulations, Risk, AI Governance</td>{render_num_cell(100, 'TRN-KMP-COV', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Employees other than BoD and KMPs</td>{render_num_cell(9493, 'TRN-EMP-NUM', entity_id, period_id)}<td>Code of conduct, human rights, POSH, cybersecurity, safety</td>{render_num_cell(100, 'TRN-EMP-COV', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Workers</td>{render_num_cell(74205, 'TRN-WRK-NUM', entity_id, period_id)}<td>Health and safety, human rights, labor laws, LOTO procedures</td>{render_num_cell(100, 'TRN-WRK-COV', entity_id, period_id, is_pct=True)}</tr>
        </tbody>
    </table>

    <div class="question-text">2. Details of fines / penalties / punishment / compounding fees paid in proceedings:</div>
    <table>
        <thead>
            <tr><th>Type</th><th>NGRBC Principle</th><th>Regulatory Agency</th><th style="text-align:right;">Amount (INR)</th><th>Brief of the Case</th><th>Appeal Preferred?</th></tr>
        </thead>
        <tbody>
            <tr><td colspan="6" class="cell-nil">No monetary fines or non-monetary punishments were imposed during {curr_yr_lbl}.</td></tr>
        </tbody>
    </table>

    <div class="question-text">8. Number of days of accounts payables ((Accounts payable * 365) / Cost of goods/services procured):</div>
    <table>
        <thead>
            <tr><th>Metric</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Number of days of accounts payables</td>
                {render_num_cell(128, 'FIN-AP-DAYS', entity_id, period_id)}
                {render_num_cell(123, 'FIN-AP-DAYS-PREV', entity_id, period_id)}
            </tr>
        </tbody>
    </table>
    <div class="footnote-restated"><i>{restatement_note}</i></div>

    <div class="question-text">9. Open-ness of business Provide details of concentration of purchases and sales with trading houses & RPTs:</div>
    <table>
        <thead>
            <tr><th>Parameter</th><th>Metrics</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td rowspan="3">Concentration of Purchases</td><td>a. Purchases from trading houses as % of total purchases</td>{render_num_cell(0.45, 'CONC-PUR-PCT', entity_id, period_id, decimals=2, is_pct=True)}{render_num_cell(0.28, 'CONC-PUR-PCT-PREV', entity_id, period_id, decimals=2, is_pct=True)}</tr>
            <tr><td>b. Number of trading houses where purchases are made from</td>{render_num_cell(25, 'CONC-PUR-NUM', entity_id, period_id)}{render_num_cell(25, 'CONC-PUR-NUM-PREV', entity_id, period_id)}</tr>
            <tr><td>c. Purchases from top 10 trading houses as % of total purchases</td>{render_num_cell(96.2, 'CONC-PUR-TOP10', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(89.5, 'CONC-PUR-TOP10-PREV', entity_id, period_id, decimals=1, is_pct=True)}</tr>
            <tr><td>Concentration of Sales</td><td>a. Sales to dealers / distributors as % of total sales</td><td colspan="2" class="cell-na">Not applicable</td></tr>
            <tr><td rowspan="4">Share of RPTs in</td><td>a. Purchases (Purchases with related parties / Total Purchases)</td>{render_num_cell(7.21, 'RPT-PUR-PCT', entity_id, period_id, decimals=2, is_pct=True)}{render_num_cell(4.34, 'RPT-PUR-PCT-PREV', entity_id, period_id, decimals=2, is_pct=True)}</tr>
            <tr><td>b. Sales (Sales to related parties / Total Sales)</td>{render_num_cell(1.46, 'RPT-SAL-PCT', entity_id, period_id, decimals=2, is_pct=True)}{render_num_cell(1.27, 'RPT-SAL-PCT-PREV', entity_id, period_id, decimals=2, is_pct=True)}</tr>
            <tr><td>c. Loans & advances (Loans given to related parties / Total)</td>{render_num_cell(26.11, 'RPT-LOAN-PCT', entity_id, period_id, decimals=2, is_pct=True)}{render_num_cell(20.96, 'RPT-LOAN-PCT-PREV', entity_id, period_id, decimals=2, is_pct=True)}</tr>
            <tr><td>d. Investments (Investments in related parties / Total Investments)</td>{render_num_cell(48.09, 'RPT-INV-PCT', entity_id, period_id, decimals=2, is_pct=True)}{render_num_cell(58.71, 'RPT-INV-PCT-PREV', entity_id, period_id, decimals=2, is_pct=True)}</tr>
        </tbody>
    </table>

    <div class="indicator-type-heading">LEADERSHIP INDICATORS</div>
    <div class="question-text">1. Awareness programmes conducted for value chain partners on any of the Principles during FY:</div>
    <table>
        <thead>
            <tr><th>Sr. No.</th><th style="text-align:right;">Programmes held</th><th>Topics / principles covered</th><th style="text-align:right;">% value chain covered</th></tr>
        </thead>
        <tbody>
            <tr><td>1</td>{render_num_cell(3, 'VC-TRN-NUM-1', entity_id, period_id)}<td>Basics of sustainability, NGRBC Principles, BRSR Core, safety & human rights</td>{render_num_cell(19.0, 'VC-TRN-COV-1', entity_id, period_id, decimals=1, is_pct=True)}</tr>
            <tr><td>2</td>{render_num_cell(1, 'VC-TRN-NUM-2', entity_id, period_id)}<td>In-depth third-party sessions on governance, ethical conduct and environmental systems</td>{render_num_cell(22.0, 'VC-TRN-COV-2', entity_id, period_id, decimals=1, is_pct=True)}</tr>
        </tbody>
    </table>
    <div class="narrative-p">Supply chain partners are selected based on materiality, scale of procurement, and ESG operational risk. Mandatory vendor onboarding requires explicit alignment with the Sustainable Supply Chain Policy and Code of Conduct.</div>
    <div class="audit-marker">AI-drafted, reviewed by Head of Procurement & Value Chain Governance on 18-May-2026</div>

    <!-- PRINCIPLE 2 -->
    <div class="principle-banner">Principle 2: Businesses should provide goods and services in a manner that is Sustainable and Safe</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">1. Percentage of R&D and capital expenditure (capex) investments in specific technologies to improve ESG impacts:</div>
    <table>
        <thead>
            <tr><th>Category</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th><th>Details of improvements in ESG impacts</th></tr>
        </thead>
        <tbody>
            <tr><td>R&D</td>{render_num_cell(2.7, 'RD-INV-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(5.4, 'RD-INV-PCT-PREV', entity_id, period_id, decimals=1, is_pct=True)}<td>Energy efficiency improvements, solar masts, smart water flowmeters</td></tr>
            <tr><td>Capex</td>{render_num_cell(2.7, 'CAPEX-INV-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(2.8, 'CAPEX-INV-PCT-PREV', entity_id, period_id, decimals=1, is_pct=True)}<td>Effluent treatment plants, rooftop solar systems, bio-digesters for organic waste</td></tr>
        </tbody>
    </table>

    <div class="question-text">2. Procedures in place for sustainable sourcing:</div>
    <div style="font-size: 8.8pt;">
        a. Does entity have procedures for sustainable sourcing? <b>Yes</b> (Sustainable Supply Chain Policy)<br/>
        b. Percentage of inputs sourced sustainably: <b>20%</b> (from 210 green-rated certified vendors)
    </div>

    <div class="indicator-type-heading">LEADERSHIP INDICATORS</div>
    <div class="question-text">3. Percentage of recycled or reused input material to total material used in production:</div>
    <table>
        <thead>
            <tr><th>Input Material</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td>Fly ash and Ground Granulated Blast-furnace Slag (GGBS) in place of Cement</td>{render_num_cell(9.2, 'MAT-REC-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(8.8, 'MAT-REC-PCT-PREV', entity_id, period_id, decimals=1, is_pct=True)}</tr>
        </tbody>
    </table>

    <!-- PRINCIPLE 3 -->
    <div class="principle-banner">Principle 3: Businesses should respect and promote the well-being of all employees, including those in their value chains</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">1. a. Details of measures for the well-being of employees:</div>
    <table>
        <thead>
            <tr>
                <th rowspan="2">Category</th>
                <th rowspan="2" style="text-align:right;">Total (A)</th>
                <th colspan="2" style="text-align:center;">Health Insurance</th>
                <th colspan="2" style="text-align:center;">Accident Insurance</th>
                <th colspan="2" style="text-align:center;">Maternity Benefits</th>
                <th colspan="2" style="text-align:center;">Day Care Facilities</th>
            </tr>
            <tr>
                <th style="text-align:right;">No.</th><th style="text-align:right;">%</th>
                <th style="text-align:right;">No.</th><th style="text-align:right;">%</th>
                <th style="text-align:right;">No.</th><th style="text-align:right;">%</th>
                <th style="text-align:right;">No.</th><th style="text-align:right;">%</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Permanent Male</td>{render_num_cell(48502, 'WB-M-TOT', entity_id, period_id)}{render_num_cell(48502, 'WB-M-HI', entity_id, period_id)}{render_num_cell(100.0, 'WB-M-HI-P', entity_id, period_id, is_pct=True)}{render_num_cell(48502, 'WB-M-AI', entity_id, period_id)}{render_num_cell(100.0, 'WB-M-AI-P', entity_id, period_id, is_pct=True)}<td colspan="2" class="cell-na">Not applicable</td>{render_num_cell(14403, 'WB-M-DC', entity_id, period_id)}{render_num_cell(30.0, 'WB-M-DC-P', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Permanent Female</td>{render_num_cell(5134, 'WB-F-TOT', entity_id, period_id)}{render_num_cell(5134, 'WB-F-HI', entity_id, period_id)}{render_num_cell(100.0, 'WB-F-HI-P', entity_id, period_id, is_pct=True)}{render_num_cell(5134, 'WB-F-AI', entity_id, period_id)}{render_num_cell(100.0, 'WB-F-AI-P', entity_id, period_id, is_pct=True)}{render_num_cell(5134, 'WB-F-MB', entity_id, period_id)}{render_num_cell(100.0, 'WB-F-MB-P', entity_id, period_id, is_pct=True)}{render_num_cell(5134, 'WB-F-DC', entity_id, period_id)}{render_num_cell(100.0, 'WB-F-DC-P', entity_id, period_id, is_pct=True)}</tr>
            <tr class="row-total"><td>Total Permanent</td>{render_num_cell(53636, 'WB-TOT-A', entity_id, period_id, bold=True)}{render_num_cell(53636, 'WB-TOT-HI', entity_id, period_id, bold=True)}{render_num_cell(100.0, 'WB-TOT-HI-P', entity_id, period_id, is_pct=True, bold=True)}{render_num_cell(53636, 'WB-TOT-AI', entity_id, period_id, bold=True)}{render_num_cell(100.0, 'WB-TOT-AI-P', entity_id, period_id, is_pct=True, bold=True)}{render_num_cell(5134, 'WB-TOT-MB', entity_id, period_id, bold=True)}{render_num_cell(100.0, 'WB-TOT-MB-P', entity_id, period_id, is_pct=True, bold=True)}{render_num_cell(19537, 'WB-TOT-DC', entity_id, period_id, bold=True)}{render_num_cell(36.0, 'WB-TOT-DC-P', entity_id, period_id, is_pct=True, bold=True)}</tr>
        </tbody>
    </table>

    <div class="question-text">2. Details of retirement benefits (Current FY vs Previous FY):</div>
    <table>
        <thead>
            <tr>
                <th rowspan="2">Benefits</th>
                <th colspan="3" class="th-current-yr">{curr_yr_lbl}</th>
                <th colspan="3" class="th-prev-yr">{prev_yr_lbl}</th>
            </tr>
            <tr>
                <th style="text-align:right;">% Employees covered</th><th style="text-align:right;">% Workers covered</th><th>Deposited with Authority?</th>
                <th style="text-align:right;">% Employees covered</th><th style="text-align:right;">% Workers covered</th><th>Deposited with Authority?</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>PF</td>{render_num_cell(100.0, 'RET-PF-EMP', entity_id, period_id, is_pct=True)}{render_num_cell(100.0, 'RET-PF-WRK', entity_id, period_id, is_pct=True)}<td style="text-align:center;">Yes</td>{render_num_cell(100.0, 'RET-PF-EMP-P', entity_id, period_id, is_pct=True)}{render_num_cell(100.0, 'RET-PF-WRK-P', entity_id, period_id, is_pct=True)}<td style="text-align:center;">Yes</td></tr>
            <tr><td>Gratuity</td>{render_num_cell(100.0, 'RET-GR-EMP', entity_id, period_id, is_pct=True)}{render_num_cell(100.0, 'RET-GR-WRK', entity_id, period_id, is_pct=True)}<td style="text-align:center;">Yes</td>{render_num_cell(100.0, 'RET-GR-EMP-P', entity_id, period_id, is_pct=True)}{render_num_cell(100.0, 'RET-GR-WRK-P', entity_id, period_id, is_pct=True)}<td style="text-align:center;">Yes</td></tr>
            <tr><td>ESI</td>{render_num_cell(0.0, 'RET-ESI-EMP', entity_id, period_id, is_pct=True)}{render_num_cell(25.0, 'RET-ESI-WRK', entity_id, period_id, is_pct=True)}<td style="text-align:center;">Yes</td>{render_num_cell(0.0, 'RET-ESI-EMP-P', entity_id, period_id, is_pct=True)}{render_num_cell(76.0, 'RET-ESI-WRK-P', entity_id, period_id, is_pct=True)}<td style="text-align:center;">Yes</td></tr>
        </tbody>
    </table>

    <div class="question-text">11. Details of safety related incidents (BRSR Core Indicator E10):</div>
    <table>
        <thead>
            <tr><th>Safety Incident / Number</th><th>Category</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td rowspan="2">Lost Time Injury Frequency Rate (LTIFR) (per 1,000,000 man-hours)</td><td>Employees</td>{render_num_cell(derived.get('ltifr_employees', 0.02), 'SOC-SAFE-001', entity_id, period_id, decimals=2)}{render_num_cell(0.04, 'SOC-SAFE-001-PREV', entity_id, period_id, decimals=2)}</tr>
            <tr><td>Workers</td>{render_num_cell(0.09, 'SAFE-LTIFR-WRK', entity_id, period_id, decimals=2)}{render_num_cell(0.12, 'SAFE-LTIFR-WRK-PREV', entity_id, period_id, decimals=2)}</tr>
            <tr><td rowspan="2">Total recordable work-related injuries</td><td>Employees</td>{render_num_cell(2, 'SAFE-INJ-EMP', entity_id, period_id)}{render_num_cell(5, 'SAFE-INJ-EMP-PREV', entity_id, period_id)}</tr>
            <tr><td>Workers</td>{render_num_cell(77, 'SAFE-INJ-WRK', entity_id, period_id)}{render_num_cell(116, 'SAFE-INJ-WRK-PREV', entity_id, period_id)}</tr>
            <tr><td rowspan="2">Number of fatalities</td><td>Employees</td>{render_num_cell(1, 'SOC-SAFE-002', entity_id, period_id)}{render_num_cell(1, 'SOC-SAFE-002-PREV', entity_id, period_id)}</tr>
            <tr><td>Workers</td>{render_num_cell(29, 'SAFE-FAT-WRK', entity_id, period_id)}{render_num_cell(33, 'SAFE-FAT-WRK-PREV', entity_id, period_id)}</tr>
        </tbody>
    </table>
    <div class="narrative-p">The Company adheres to the 'VISION KNOW HARM' occupational health and safety roadmap with strict stop-work authority granted to all site engineers and workmen. Occurrence Root Cause Analysis (ORCA) audits were conducted for all serious incidents.</div>
    <div class="audit-marker">AI-drafted, reviewed by Corporate Head EHS on 20-May-2026</div>

    <!-- PRINCIPLE 4 -->
    <div class="principle-banner">Principle 4: Businesses should respect the interests of and be responsive to all its stakeholders</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>
    <div class="question-text">1 & 2. Stakeholder consultation and key stakeholder groups:</div>
    <div class="narrative-p">Structured stakeholder identification encompasses value chain mapping, impact assessments, and consultative engagement forums. Key identified groups include government bodies, customers, employees, labor unions, investors, and local communities.</div>

    <!-- PRINCIPLE 5 -->
    <div class="principle-banner">Principle 5: Businesses should respect and promote human rights</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">1. Human rights training coverage:</div>
    <table>
        <thead>
            <tr>
                <th rowspan="2">Category</th>
                <th colspan="3" class="th-current-yr">{curr_yr_lbl}</th>
                <th colspan="3" class="th-prev-yr">{prev_yr_lbl}</th>
            </tr>
            <tr>
                <th style="text-align:right;">Total (A)</th><th style="text-align:right;">Covered (B)</th><th style="text-align:right;">% (B/A)</th>
                <th style="text-align:right;">Total (C)</th><th style="text-align:right;">Covered (D)</th><th style="text-align:right;">% (D/C)</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Permanent Employees</td>{render_num_cell(53636, 'HR-TRN-EMP-TOT', entity_id, period_id)}{render_num_cell(22662, 'HR-TRN-EMP-COV', entity_id, period_id)}{render_num_cell(42.0, 'HR-TRN-EMP-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(52505, 'HR-TRN-EMP-TOT-P', entity_id, period_id)}{render_num_cell(57756, 'HR-TRN-EMP-COV-P', entity_id, period_id)}{render_num_cell(100.0, 'HR-TRN-EMP-PCT-P', entity_id, period_id, decimals=1, is_pct=True)}</tr>
            <tr><td>Total Workers</td>{render_num_cell(380065, 'HR-TRN-WRK-TOT', entity_id, period_id)}{render_num_cell(361294, 'HR-TRN-WRK-COV', entity_id, period_id)}{render_num_cell(95.0, 'HR-TRN-WRK-PCT', entity_id, period_id, decimals=1, is_pct=True)}{render_num_cell(356506, 'HR-TRN-WRK-TOT-P', entity_id, period_id)}{render_num_cell(356506, 'HR-TRN-WRK-COV-P', entity_id, period_id)}{render_num_cell(100.0, 'HR-TRN-WRK-PCT-P', entity_id, period_id, decimals=1, is_pct=True)}</tr>
        </tbody>
    </table>

    <div class="question-text">2. Details of minimum wages paid to employees and workers:</div>
    <table>
        <thead>
            <tr>
                <th rowspan="2">Category</th>
                <th rowspan="2" style="text-align:right;">Total (A)</th>
                <th colspan="2" style="text-align:center;">Equal to Min Wage</th>
                <th colspan="2" style="text-align:center;">More than Min Wage</th>
            </tr>
            <tr>
                <th style="text-align:right;">No.</th><th style="text-align:right;">%</th>
                <th style="text-align:right;">No.</th><th style="text-align:right;">%</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Permanent Employees</td>{render_num_cell(53636, 'MW-EMP-TOT', entity_id, period_id)}<td class="cell-nil">–</td><td class="cell-nil">–</td>{render_num_cell(53636, 'MW-EMP-MORE', entity_id, period_id)}{render_num_cell(100.0, 'MW-EMP-MORE-P', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Permanent Workers</td>{render_num_cell(2026, 'MW-WRK-TOT', entity_id, period_id)}<td class="cell-nil">–</td><td class="cell-nil">–</td>{render_num_cell(2026, 'MW-WRK-MORE', entity_id, period_id)}{render_num_cell(100.0, 'MW-WRK-MORE-P', entity_id, period_id, is_pct=True)}</tr>
            <tr><td>Other Than Permanent Workers</td>{render_num_cell(378039, 'MW-OTP-TOT', entity_id, period_id)}{render_num_cell(338512, 'MW-OTP-EQ', entity_id, period_id)}{render_num_cell(90.0, 'MW-OTP-EQ-P', entity_id, period_id, is_pct=True)}{render_num_cell(39527, 'MW-OTP-MORE', entity_id, period_id)}{render_num_cell(10.0, 'MW-OTP-MORE-P', entity_id, period_id, is_pct=True)}</tr>
        </tbody>
    </table>

    <div class="question-text">3. Median remuneration & Gross wages paid to females:</div>
    <table>
        <thead>
            <tr><th>Particulars</th><th style="text-align:right;">Male Median (INR)</th><th style="text-align:right;">Female Median (INR)</th></tr>
        </thead>
        <tbody>
            <tr><td>Board of Directors (Whole Time)</td>{render_num_cell(298911975, 'MED-BOD-M', entity_id, period_id, is_currency=True)}<td class="cell-nil">–</td></tr>
            <tr><td>Employees other than BoD and KMP</td>{render_num_cell(1248234, 'MED-EMP-M', entity_id, period_id, is_currency=True)}{render_num_cell(801115, 'MED-EMP-F', entity_id, period_id, is_currency=True)}</tr>
            <tr><td>Workers</td>{render_num_cell(1163034, 'MED-WRK-M', entity_id, period_id, is_currency=True)}{render_num_cell(1942567, 'MED-WRK-F', entity_id, period_id, is_currency=True)}</tr>
        </tbody>
    </table>
    <div style="font-size: 8.8pt; margin-top: 4px;">
        Gross wages paid to females as % of total wages: <b>6.1%</b> ({curr_yr_lbl}) vs <b>5.7%</b> ({prev_yr_lbl}) &bull; Complaints under POSH Act: <b>9</b> received, <b>6</b> upheld, <b>1</b> under investigation.
    </div>

    <!-- PRINCIPLE 6 -->
    <div class="principle-banner">Principle 6: Businesses should respect and make efforts to protect and restore the environment</div>
    <div class="indicator-type-heading">ESSENTIAL INDICATORS</div>

    <div class="question-text">1. Details of total energy consumption and energy intensity (in Joules or multiples):</div>
    <table>
        <thead>
            <tr><th>Parameter</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td colspan="3" style="background:#f1f5f9; font-weight:700;">From Renewable Sources (in Gigajoules)</td></tr>
            <tr><td>Total electricity consumption (A)</td>{render_num_cell(curr_v.get('ENV-ENERGY-001', 352937), 'ENV-ENERGY-001', entity_id, period_id)}{render_num_cell(prev_v.get('ENV-ENERGY-001', 248561), 'ENV-ENERGY-001-P', entity_id, period_id)}</tr>
            <tr><td>Total fuel consumption (B)</td>{render_num_cell(curr_v.get('ENV-ENERGY-002', 82993), 'ENV-ENERGY-002', entity_id, period_id)}{render_num_cell(prev_v.get('ENV-ENERGY-002', 64882), 'ENV-ENERGY-002-P', entity_id, period_id)}</tr>
            <tr class="row-total"><td>Total energy consumed from renewable sources (A + B)</td>{render_num_cell(435930, 'NRG-REN-TOT', entity_id, period_id, bold=True)}{render_num_cell(313443, 'NRG-REN-TOT-P', entity_id, period_id, bold=True)}</tr>
            <tr><td colspan="3" style="background:#f1f5f9; font-weight:700;">From Non-Renewable Sources (in Gigajoules)</td></tr>
            <tr><td>Total electricity consumption (D)</td>{render_num_cell(1478304, 'NRG-NONREN-ELE', entity_id, period_id)}{render_num_cell(1410297, 'NRG-NONREN-ELE-P', entity_id, period_id)}</tr>
            <tr><td>Total fuel consumption (E)</td>{render_num_cell(8309739, 'NRG-NONREN-FUL', entity_id, period_id)}{render_num_cell(8206677, 'NRG-NONREN-FUL-P', entity_id, period_id)}</tr>
            <tr class="row-total"><td>Total energy consumed from non-renewable sources (D + E)</td>{render_num_cell(9788043, 'NRG-NONREN-TOT', entity_id, period_id, bold=True)}{render_num_cell(9616974, 'NRG-NONREN-TOT-P', entity_id, period_id, bold=True)}</tr>
            <tr class="row-total" style="background:#e2e8f0;"><td>Total Energy Consumed (A + B + D + E) (GJ)</td>{render_num_cell(10223973, 'NRG-GRAND-TOT', entity_id, period_id, bold=True)}{render_num_cell(9930417, 'NRG-GRAND-TOT-P', entity_id, period_id, bold=True)}</tr>
            <tr><td>Energy intensity per rupee of turnover (GJ / ₹ Crore)</td>{render_num_cell(derived.get('energy_intensity_gj_per_cr', 66.5), 'CALC-INTENSITY-ENERGY', entity_id, period_id, decimals=1)}{render_num_cell(69.7, 'NRG-INT-PREV', entity_id, period_id, decimals=1)}</tr>
            <tr><td>Energy intensity adjusted for Purchasing Power Parity (PPP) (GJ / PPP Mn USD)</td>{render_num_cell(135.3, 'NRG-INT-PPP', entity_id, period_id, decimals=1)}{render_num_cell(144.0, 'NRG-INT-PPP-P', entity_id, period_id, decimals=1)}</tr>
        </tbody>
    </table>
    <div class="narrative-p">Note: Independent reasonable assurance carried out by {assurance.get('provider_name', 'BDO India Services Private Limited')}. Energy intensity decreased by 4.5% driven by DG set conversions to direct grid connections.</div>

    <div class="question-text">3. Water withdrawal and consumption disclosures (in kilolitres):</div>
    <table>
        <thead>
            <tr><th>Parameter</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td>Surface water</td>{render_num_cell(2538214, 'WTR-SURF', entity_id, period_id)}{render_num_cell(2573331, 'WTR-SURF-P', entity_id, period_id)}</tr>
            <tr><td>Groundwater</td>{render_num_cell(6871465, 'WTR-GW', entity_id, period_id)}{render_num_cell(8815932, 'WTR-GW-P', entity_id, period_id)}</tr>
            <tr><td>Third party water</td>{render_num_cell(392795, 'WTR-3P', entity_id, period_id)}{render_num_cell(585735, 'WTR-3P-P', entity_id, period_id)}</tr>
            <tr><td>Seawater / Desalinated water</td>{render_num_cell(189, 'WTR-SEA', entity_id, period_id)}{render_num_cell(2920, 'WTR-SEA-P', entity_id, period_id)}</tr>
            <tr><td>Others (municipal / rainwater / tankers)</td>{render_num_cell(7658659, 'WTR-OTH', entity_id, period_id)}{render_num_cell(7840556, 'WTR-OTH-P', entity_id, period_id)}</tr>
            <tr class="row-total"><td>Total volume of water withdrawal (kL)</td>{render_num_cell(17461322, 'WTR-WITH-TOT', entity_id, period_id, bold=True)}{render_num_cell(19818474, 'WTR-WITH-TOT-P', entity_id, period_id, bold=True)}</tr>
            <tr class="row-total" style="background:#e2e8f0;"><td>Total volume of water consumption (kL)</td>{render_num_cell(curr_v.get('ENV-WATER-001', 12730509), 'ENV-WATER-001', entity_id, period_id, bold=True)}{render_num_cell(prev_v.get('ENV-WATER-001', 15431695), 'ENV-WATER-001-P', entity_id, period_id, bold=True)}</tr>
            <tr><td>Water intensity per rupee of turnover (kL / ₹ Crore)</td>{render_num_cell(derived.get('water_intensity_kl_per_cr', 82.8), 'CALC-INTENSITY-WATER', entity_id, period_id, decimals=1)}{render_num_cell(108.3, 'WTR-INT-PREV', entity_id, period_id, decimals=1)}</tr>
        </tbody>
    </table>

    <div class="question-text">7. Greenhouse Gas Emissions (Scope 1 & Scope 2) and Intensity:</div>
    <table>
        <thead>
            <tr><th>Parameter</th><th>UOM</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td>Total Scope 1 emissions</td><td>tCO2e</td>{render_num_cell(curr_v.get('ENV-GHG-001', 617113), 'ENV-GHG-001', entity_id, period_id)}{render_num_cell(prev_v.get('ENV-GHG-001', 603953), 'ENV-GHG-001-P', entity_id, period_id)}</tr>
            <tr><td>Total Scope 2 emissions</td><td>tCO2e</td>{render_num_cell(curr_v.get('ENV-GHG-002', 289920), 'ENV-GHG-002', entity_id, period_id)}{render_num_cell(prev_v.get('ENV-GHG-002', 282341), 'ENV-GHG-002-P', entity_id, period_id)}</tr>
            <tr class="row-total"><td>Total Scope 1 and Scope 2 emissions per Rupee turnover</td><td>tCO2e / ₹ Cr</td>{render_num_cell(derived.get('ghg_intensity_tco2e_per_cr', 5.9), 'CALC-INTENSITY-GHG', entity_id, period_id, decimals=1, bold=True)}{render_num_cell(6.2, 'GHG-INT-PREV', entity_id, period_id, decimals=1, bold=True)}</tr>
        </tbody>
    </table>

    <div class="question-text">9. Waste Management and circularity disclosures:</div>
    <table>
        <thead>
            <tr><th>Parameter</th><th class="th-current-yr">{curr_yr_lbl}</th><th class="th-prev-yr">{prev_yr_lbl}</th></tr>
        </thead>
        <tbody>
            <tr><td>Plastic waste (A)</td>{render_num_cell(940, 'WST-PLA', entity_id, period_id)}{render_num_cell(818, 'WST-PLA-P', entity_id, period_id)}</tr>
            <tr><td>E-waste (B)</td>{render_num_cell(287, 'WST-EW', entity_id, period_id)}{render_num_cell(61, 'WST-EW-P', entity_id, period_id)}</tr>
            <tr><td>Construction & Demolition waste (D)</td>{render_num_cell(402448, 'WST-CD', entity_id, period_id)}{render_num_cell(262736, 'WST-CD-P', entity_id, period_id)}</tr>
            <tr><td>Battery waste (E)</td>{render_num_cell(80, 'WST-BAT', entity_id, period_id)}{render_num_cell(204, 'WST-BAT-P', entity_id, period_id)}</tr>
            <tr><td>Other Hazardous waste (G)</td>{render_num_cell(4394, 'WST-HAZ', entity_id, period_id)}{render_num_cell(4303, 'WST-HAZ-P', entity_id, period_id)}</tr>
            <tr><td>Other Non-hazardous waste (H)</td>{render_num_cell(188030, 'WST-NONHAZ', entity_id, period_id)}{render_num_cell(183102, 'WST-NONHAZ-P', entity_id, period_id)}</tr>
            <tr class="row-total" style="background:#e2e8f0;"><td>Total Waste Generated (MT)</td>{render_num_cell(curr_v.get('ENV-WASTE-001', 596194), 'ENV-WASTE-001', entity_id, period_id, bold=True)}{render_num_cell(prev_v.get('ENV-WASTE-001', 451226), 'ENV-WASTE-001-P', entity_id, period_id, bold=True)}</tr>
            <tr class="row-total"><td>Total Waste Recovered (Recycled + Reused) (MT)</td>{render_num_cell(310253, 'WST-REC-TOT', entity_id, period_id, bold=True)}{render_num_cell(80440, 'WST-REC-TOT-P', entity_id, period_id, bold=True)}</tr>
            <tr class="row-total"><td>Total Waste Disposed (Landfilled + Incinerated + Other) (MT)</td>{render_num_cell(271079, 'WST-DISP-TOT', entity_id, period_id, bold=True)}{render_num_cell(372962, 'WST-DISP-TOT-P', entity_id, period_id, bold=True)}</tr>
        </tbody>
    </table>
    <div class="narrative-p">Over 52% of total generated waste was channelized for circular resource recovery, with C&D waste repurposed as structural backfill at EPC project sites.</div>
    <div class="audit-marker">AI-drafted, reviewed by Waste Circularity Cell on 22-May-2026</div>
    """
''')
print("append_html_part3 written")
