import os

target = os.path.join("app", "modules", "reporting", "brsr_generator.py")

with open(target, "a", encoding="utf-8") as f:
    f.write('''

def get_report_css() -> str:
    """Returns CSS styles faithfully reproducing the visual aesthetic of the L&T BRSR Report."""
    return """
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap');

        @page {
            size: 594pt 738pt;
            margin: 12mm 14mm 16mm 14mm;
            @top-left {
                content: "LARSEN & TOUBRO";
                font-family: 'Source Sans 3', sans-serif;
                font-size: 8.5pt;
                font-weight: 700;
                color: #1F3F8F;
            }
            @top-right {
                content: "Business Responsibility & Sustainability Reporting";
                font-family: 'Source Sans 3', sans-serif;
                font-size: 8.5pt;
                color: #475569;
            }
            @bottom-left {
                content: counter(page);
                font-family: 'Source Sans 3', sans-serif;
                font-size: 8pt;
                font-weight: 700;
                background-color: #1F3F8F;
                color: #ffffff;
                padding: 2px 7px;
                border-radius: 2px;
            }
            @bottom-right {
                content: "Integrated Annual Report 2025-26";
                font-family: 'Source Sans 3', sans-serif;
                font-size: 8pt;
                color: #64748b;
            }
        }

        body {
            font-family: 'Source Sans 3', 'Open Sans', Arial, sans-serif;
            font-size: 9.5pt;
            line-height: 1.45;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }

        /* Top Corporate Running Navigation Strip */
        .top-nav-strip {
            display: flex;
            justify-content: flex-end;
            gap: 20px;
            font-size: 7.5pt;
            color: #64748b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 18px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .top-nav-strip span.active {
            color: #0f172a;
            font-weight: 700;
            position: relative;
        }
        .top-nav-strip span.active::before {
            content: "■ ";
            color: #1F3F8F;
        }

        /* Main Report Title */
        .report-main-title {
            color: #1F3F8F;
            font-size: 18pt;
            font-weight: 800;
            letter-spacing: -0.01em;
            margin: 0 0 12px 0;
            text-transform: uppercase;
        }

        /* Section Banner Strip */
        .section-strip {
            color: #0284c7;
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 4px;
            margin: 18px 0 12px 0;
            letter-spacing: 0.05em;
        }

        /* Subsection Heading */
        .sub-header {
            font-size: 10pt;
            font-weight: 700;
            color: #0f172a;
            margin: 14px 0 8px 0;
            text-transform: uppercase;
        }

        /* Principle Grey Banner */
        .principle-banner {
            background-color: #e9edf2;
            color: #0f172a;
            padding: 8px 12px;
            font-size: 10.5pt;
            font-weight: 700;
            border-left: 4px solid #1F3F8F;
            margin: 20px 0 12px 0;
            page-break-after: avoid;
            break-after: avoid;
        }

        /* Indicator Heading (Essential / Leadership) */
        .indicator-type-heading {
            color: #1F3F8F;
            font-size: 9pt;
            font-weight: 800;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin: 14px 0 6px 0;
            border-bottom: 1px dotted #94a3b8;
            padding-bottom: 2px;
        }

        /* Question Paragraph */
        .question-text {
            font-size: 9.5pt;
            font-weight: 700;
            color: #1e293b;
            margin: 10px 0 6px 0;
        }

        /* Narrative Note & Audit Trail */
        .narrative-p {
            font-size: 8.8pt;
            color: #334155;
            margin: 6px 0;
            text-align: justify;
        }
        .audit-marker {
            font-size: 7.5pt;
            color: #059669;
            font-style: italic;
            display: inline-block;
            margin-top: 3px;
            background: #ecfdf5;
            padding: 1px 6px;
            border-radius: 3px;
        }

        /* Completeness Banner */
        .completeness-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid #1F3F8F;
            padding: 10px 14px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .completeness-title {
            font-weight: 700;
            font-size: 10pt;
            color: #1F3F8F;
        }
        .completeness-badge {
            background: #1F3F8F;
            color: #ffffff;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 9pt;
        }

        /* Footnotes */
        .footnote-restated {
            font-size: 8pt;
            color: #b45309;
            font-style: italic;
            margin-top: 4px;
            margin-bottom: 8px;
        }

        /* Tables matching L&T Reference */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
            margin: 8px 0 12px 0;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        thead {
            display: table-header-group;
        }
        tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            vertical-align: middle;
        }
        th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
        }
        th.th-current-yr {
            background-color: #1F3F8F !important;
            color: #ffffff !important;
            text-align: center;
        }
        th.th-prev-yr {
            background-color: #e2e8f0 !important;
            color: #1e293b !important;
            text-align: center;
        }
        .cell-num {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }
        .clickable-kpi:hover {
            background-color: #eff6ff !important;
            outline: 1px dashed #2563eb;
        }
        .cell-nil {
            text-align: center;
            color: #64748b;
        }
        .cell-missing {
            text-align: center;
            color: #94a3b8;
            font-style: italic;
        }
        .row-total {
            font-weight: 700;
            background-color: #f8fafc;
        }
        .cell-na {
            text-align: center;
            color: #64748b;
            font-style: italic;
            background-color: #f8fafc;
        }
    """
''')
print("get_report_css appended")
