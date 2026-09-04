import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { SANJUAN_LOGO_BASE64, BARANGAY_LOGO_BASE64, HEADER_TEXT_BASE64 } from "@/lib/officialHeaderAssets";

interface ReportFile {
  folder: string;
  filename: string;
  content: string;
  type?: string;
}

const getHtmlTemplate = (title: string, subtitle: string, bodyContent: string, landscape = false) => {
  const logos = {
    sanjuan: SANJUAN_LOGO_BASE64,
    headerText: HEADER_TEXT_BASE64,
    barangay: BARANGAY_LOGO_BASE64
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Barangay Subukin Health Center</title>
  <style>
    @page {
      size: ${landscape ? "A4 landscape" : "A4 portrait"};
      margin: 10mm 8mm 12mm 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
    }

    /* Multi-page Header Repeat: Outer document layout table forces thead on every page */
    table.report-document-layout {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin: 0;
      padding: 0;
    }
    table.report-document-layout > thead {
      display: table-header-group !important;
    }
    table.report-document-layout > thead > tr > td.report-header-cell {
      border: none;
      padding: 0 0 10px 0;
      background: transparent;
      vertical-align: top;
    }
    table.report-document-layout > tbody > tr > td.report-body-cell {
      border: none;
      padding: 0;
      vertical-align: top;
      background: transparent;
    }

    /* Official Barangay Subukin Header Structure */
    .official-header-block {
      width: 100%;
      text-align: center;
      margin-bottom: 2px;
    }
    table.header-seals-grid {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin: 0 0 4px 0;
    }
    table.header-seals-grid tr, table.header-seals-grid td {
      border: none;
      padding: 0;
      background: transparent;
    }
    .seal-left {
      width: 16%;
      text-align: left;
      vertical-align: middle;
    }
    .seal-center {
      width: 68%;
      text-align: center;
      vertical-align: middle;
    }
    .seal-right {
      width: 16%;
      text-align: right;
      vertical-align: middle;
    }
    .seal-left img, .seal-right img {
      height: 75px;
      width: auto;
      max-width: 85px;
      object-fit: contain;
      display: inline-block;
      mix-blend-mode: multiply;
    }
    .seal-center img {
      height: 75px;
      width: auto;
      max-width: 95%;
      object-fit: contain;
      display: inline-block;
      mix-blend-mode: multiply;
    }
    .header-double-rule {
      width: 100%;
      border-bottom: 3.5px double #000000;
      margin: 2px 0 8px 0;
    }
    .report-title {
      font-size: 15px;
      font-weight: 800;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
      text-align: center;
    }
    .report-subtitle {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
      text-align: center;
      margin: 0 0 4px 0;
    }

    /* Inner Data Tables */
    table:not(.report-document-layout):not(.header-seals-grid) {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }
    table:not(.report-document-layout):not(.header-seals-grid) th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #94a3b8;
      text-transform: uppercase;
      font-size: 9px;
    }
    table:not(.report-document-layout):not(.header-seals-grid) td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    table:not(.report-document-layout):not(.header-seals-grid) tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 14px;
      font-size: 10px;
      font-weight: 600;
    }
    .stat-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; }
    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 600;
      background: #e2e8f0;
    }
    .tag-success { background: #dcfce7; color: #15803d; }
    .tag-danger { background: #fee2e2; color: #b91c1c; }
    .tag-warning { background: #fef3c7; color: #b45309; }
    .tag-info { background: #e0f2fe; color: #0369a1; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin: 14px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
    }
    .signatures-block {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-col {
      width: 45%;
    }
    .sig-line {
      margin-top: 30px;
      border-bottom: 1px solid #0f172a;
      width: 80%;
    }
    .sig-name {
      font-weight: 700;
      margin-top: 4px;
      font-size: 10px;
    }
    .sig-role {
      color: #64748b;
      font-size: 9px;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      margin: -20px -20px 16px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .print-btn {
      background: #e11d48;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      font-size: 11px;
    }
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0; }
      table.report-document-layout > thead {
        display: table-header-group !important;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div><strong>Barangay Subukin Health Records System</strong> • Official Exported Report</div>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF (Ctrl+P)</button>
  </div>

  <table class="report-document-layout">
    <thead>
      <tr>
        <td class="report-header-cell">
          <div class="official-header-block">
            <table class="header-seals-grid">
              <tr>
                <td class="seal-left">
                  <img src="${logos.sanjuan}" alt="San Juan Seal" />
                </td>
                <td class="seal-center">
                  <img src="${logos.headerText}" alt="Republika ng Pilipinas • Lalawigan ng Batangas • Bayan ng San Juan • Barangay Subukin" />
                </td>
                <td class="seal-right">
                  <img src="${logos.barangay}" alt="Barangay Subukin Logo" />
                </td>
              </tr>
            </table>
            <div class="header-double-rule"></div>
            <div class="report-title">${title}</div>
            <div class="report-subtitle">${subtitle}</div>
          </div>
        </td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="report-body-cell">
          ${bodyContent}
          <div class="signatures-block">
            <div class="sig-col">
              <div>Prepared &amp; Certified Correct:</div>
              <div class="sig-line"></div>
              <div class="sig-name">ATTENDING BARANGAY HEALTH WORKER (BHW)</div>
              <div class="sig-role">Health Center Field Staff • Subukin, San Juan</div>
            </div>
            <div class="sig-col text-right">
              <div style="display:inline-block; text-align:left;">
                <div>Noted &amp; Approved By:</div>
                <div class="sig-line" style="width: 100%;"></div>
                <div class="sig-name">BARANGAY HEALTH SUPERVISOR / MIDWIFE</div>
                <div class="sig-role">Rural Health Unit (RHU) • San Juan, Batangas</div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
};

export const generateFullReportFolder = async (
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; method: "filesystem" | "zip"; error?: string }> => {
  const log = (msg: string) => {
    if (onProgress) onProgress(msg);
  };
  try {
    log("Fetching all health center data, forms, and audit logs...");

    // 1. Fetch all data across the system in parallel
    const [
      residentsRes,
      consultationsRes,
      familyDataRes,
      dengueRes,
      philpenRes,
      maternalRes,
      childRes,
      fpRes,
      activityRes,
      workersRes
    ] = await Promise.all([
      supabase.from("residents").select("*").order("full_name", { ascending: true }),
      supabase.from("consultations").select("*, residents(full_name, sitio, age, gender)").order("created_at", { ascending: false }),
      supabase.from("family_data").select("*").order("family_number", { ascending: true }),
      supabase.from("dengue_prevention").select("*").order("created_at", { ascending: false }),
      supabase.from("philpen_health").select("*, residents(full_name, sitio, age, gender)").order("created_at", { ascending: false }),
      supabase.from("maternal_care" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("child_health" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("family_planning").select("*, residents(full_name, sitio, age, gender, family_number)").order("created_at", { ascending: false }),
      supabase.from("activity_logs" as any).select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles" as any).select("*").order("full_name", { ascending: true })
    ]);

    const residents = residentsRes.data || [];
    const consultations = consultationsRes.data || [];
    const familyData = familyDataRes.data || [];
    const dengue = dengueRes.data || [];
    const philpen = philpenRes.data || [];
    const maternal = (maternalRes.data as any[]) || [];
    const child = (childRes.data as any[]) || [];
    const familyPlanning = fpRes.data || [];
    const activityLogs = (activityRes.data as any[]) || [];
    const workers = (workersRes.data as any[]) || [];

    // Local Storage items (Custom forms, draft schedules, local activity backups)
    const customForms = JSON.parse(localStorage.getItem("bhw_custom_forms") || "[]");
    const customSubmissions = JSON.parse(localStorage.getItem("bhw_custom_form_records") || "[]");
    const backupSchedules = JSON.parse(localStorage.getItem("bhw_backup_schedules") || "[]");
    const pastBackupsMeta = JSON.parse(localStorage.getItem("bhw_backups_metadata") || "[]");

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false }).replace(/:/g, "-");
    const folderRootName = `BHW_Subukin_Full_Report_${dateStr}_${timeStr}`;
    const generatedDateFormatted = now.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "medium"
    });

    log("Building printable ledgers, weekly summaries, and admin reports...");

    const files: ReportFile[] = [];

    // Helper: Weekly partitions
    const getMondayOfDate = (d: Date) => {
      const copy = new Date(d);
      const day = copy.getDay();
      const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
      copy.setDate(diff);
      copy.setHours(0, 0, 0, 0);
      return copy;
    };

    const currentMonday = getMondayOfDate(now);

    // ==========================================
    // 00. EXECUTIVE SUMMARY & SYSTEM OVERVIEW
    // ==========================================
    const execSummaryContent = `
      <div class="meta-bar">
        <div>Generated: <strong>${generatedDateFormatted}</strong></div>
        <div>System Version: <strong>BHW Subukin e-Health v2.0</strong></div>
      </div>

      <div class="section-title">Health Center Key Performance Statistics</div>
      <table>
        <thead>
          <tr>
            <th>Metric / Record Category</th>
            <th class="text-center">Total Volume</th>
            <th class="text-center">Current Week Entries</th>
            <th>Primary Coverage / Scope</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Master Resident Registry</strong></td>
            <td class="text-center font-bold">${residents.length}</td>
            <td class="text-center">${residents.filter(r => new Date(r.created_at || "") >= currentMonday).length}</td>
            <td>All registered constituents across Subukin Sitios</td>
          </tr>
          <tr>
            <td><strong>Family Data & Household Census</strong></td>
            <td class="text-center font-bold">${familyData.length}</td>
            <td class="text-center">${familyData.filter(r => new Date(r.created_at || "") >= currentMonday).length}</td>
            <td>Household heads, mothers, and family members</td>
          </tr>
          <tr>
            <td><strong>Medical Consultations</strong></td>
            <td class="text-center font-bold">${consultations.length}</td>
            <td class="text-center">${consultations.filter(r => new Date(r.created_at || r.consultation_date || "") >= currentMonday).length}</td>
            <td>Outpatient diagnosis, vitals, complaints & prescriptions</td>
          </tr>
          <tr>
            <td><strong>PhilPen Risk Assessments (NCD)</strong></td>
            <td class="text-center font-bold">${philpen.length}</td>
            <td class="text-center">${philpen.filter(r => new Date(r.created_at || r.record_date || "") >= currentMonday).length}</td>
            <td>Hypertension, diabetes, BMI & cardiovascular risk</td>
          </tr>
          <tr>
            <td><strong>Dengue Larval Surveillance</strong></td>
            <td class="text-center font-bold">${dengue.length}</td>
            <td class="text-center">${dengue.filter(r => new Date(r.created_at || "") >= currentMonday).length}</td>
            <td>Household water containers & vector eradication</td>
          </tr>
          <tr>
            <td><strong>Maternal Care & Prenatal Visits</strong></td>
            <td class="text-center font-bold">${maternal.length}</td>
            <td class="text-center">${maternal.filter(r => new Date(r.created_at || "") >= currentMonday).length}</td>
            <td>Expectant mothers, EDC, trimesters & high-risk care</td>
          </tr>
          <tr>
            <td><strong>Child Health & Immunization</strong></td>
            <td class="text-center font-bold">${child.length}</td>
            <td class="text-center">${child.filter(r => new Date(r.created_at || "") >= currentMonday).length}</td>
            <td>Sick children care, Vitamin A supplementation & SIA</td>
          </tr>
          <tr>
            <td><strong>Family Planning (FP Form 1)</strong></td>
            <td class="text-center font-bold">${familyPlanning.length}</td>
            <td class="text-center">${familyPlanning.filter(r => new Date(r.created_at || "") >= currentMonday).length}</td>
            <td>Contraceptive acceptors, method tracking & counseling</td>
          </tr>
          <tr>
            <td><strong>Custom Digital Forms & Submissions</strong></td>
            <td class="text-center font-bold">${customForms.length} Forms (${customSubmissions.length} Submissions)</td>
            <td class="text-center">—</td>
            <td>Dynamic health questionnaires & special campaigns</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Sitio Distribution Summary</div>
      <table>
        <thead>
          <tr>
            <th>Sitio Name</th>
            <th class="text-center">Total Residents</th>
            <th class="text-center">Senior Citizens (60+)</th>
            <th class="text-center">Children (&le; 12)</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(new Set(residents.map(r => r.sitio || "Centro"))).sort().map(sitio => {
            const inSitio = residents.filter(r => (r.sitio || "Centro") === sitio);
            const seniors = inSitio.filter(r => (Number(r.age) || 0) >= 60).length;
            const children = inSitio.filter(r => (Number(r.age) || 0) <= 12).length;
            return `
              <tr>
                <td><strong>${sitio}</strong></td>
                <td class="text-center font-bold">${inSitio.length}</td>
                <td class="text-center">${seniors}</td>
                <td class="text-center">${children}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    files.push({
      folder: "",
      filename: "00_Executive_Summary_and_System_Overview.html",
      content: getHtmlTemplate(
        "Executive Comprehensive Health Report & Demographics Overview",
        `Barangay Subukin Health Center • Official Full System Export • ${generatedDateFormatted}`,
        execSummaryContent
      )
    });

    // ==========================================
    // 01. WEEKLY HEALTH REPORTS (HTML)
    // ==========================================

    // Weekly Consultations
    const weeklyConsContent = `
      <div class="meta-bar">
        <div>Current Week Consultations: <strong>${consultations.filter(c => new Date(c.created_at || c.consultation_date || "") >= currentMonday).length}</strong></div>
        <div>All-time Total: <strong>${consultations.length}</strong></div>
      </div>
      <div class="section-title">Active Week Consultation Records</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Patient Name</th>
            <th>Sitio</th>
            <th>Age/Sex</th>
            <th>Chief Complaint / Cause</th>
            <th>BP / Vitals</th>
          </tr>
        </thead>
        <tbody>
          ${consultations.filter(c => new Date(c.created_at || c.consultation_date || "") >= currentMonday).length === 0
            ? '<tr><td colspan="6" class="text-center">No consultations recorded in the current week.</td></tr>'
            : consultations.filter(c => new Date(c.created_at || c.consultation_date || "") >= currentMonday).map(c => `
              <tr>
                <td>${c.consultation_date || new Date(c.created_at).toLocaleDateString()}</td>
                <td class="font-bold">${c.residents?.full_name || "—"}</td>
                <td>${c.sitio || c.residents?.sitio || "—"}</td>
                <td>${c.residents?.age ? `${c.residents.age}y` : "—"} / ${c.residents?.gender || "—"}</td>
                <td>${c.consultation_cause || "—"}</td>
                <td>${c.temperature ? `T: ${c.temperature}°C` : ""} ${c.pulse_rate ? `PR: ${c.pulse_rate}` : ""}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_Consultations_Report.html",
      content: getHtmlTemplate("Weekly Medical Consultation Summary Report", "Barangay Subukin Health Center", weeklyConsContent)
    });

    // Weekly Family Census
    const weeklyFamContent = `
      <div class="meta-bar">
        <div>Current Week Family Files: <strong>${familyData.filter(f => new Date(f.created_at || "") >= currentMonday).length}</strong></div>
        <div>Total Families Registered: <strong>${familyData.length}</strong></div>
      </div>
      <div class="section-title">Active Week Registered Families</div>
      <table>
        <thead>
          <tr>
            <th>Family # (FN)</th>
            <th>Household Head (Father)</th>
            <th>Mother's Name</th>
            <th>Sitio</th>
            <th class="text-center">Total Members</th>
          </tr>
        </thead>
        <tbody>
          ${familyData.filter(f => new Date(f.created_at || "") >= currentMonday).length === 0
            ? '<tr><td colspan="5" class="text-center">No family records added in current week.</td></tr>'
            : familyData.filter(f => new Date(f.created_at || "") >= currentMonday).map(f => `
              <tr>
                <td class="font-mono font-bold">${f.family_number || "—"}</td>
                <td class="font-bold">${f.father_name || "—"}</td>
                <td>${f.mother_name || "—"}</td>
                <td>${f.sitio || "Centro"}</td>
                <td class="text-center font-bold">${f.total_members || "—"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_Family_Census_Report.html",
      content: getHtmlTemplate("Weekly Family Census & Demographics Report", "Barangay Subukin Health Center", weeklyFamContent)
    });

    // Weekly PhilPen
    const weeklyPhilpenContent = `
      <div class="meta-bar">
        <div>Current Week Assessments: <strong>${philpen.filter(p => new Date(p.created_at || p.record_date || "") >= currentMonday).length}</strong></div>
        <div>All-time Assessments: <strong>${philpen.length}</strong></div>
      </div>
      <div class="section-title">Active Week PhilPen Risk Screenings</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Resident Name</th>
            <th>Sitio</th>
            <th>Blood Pressure (BP)</th>
            <th>BMI / Status</th>
            <th>Smoking / Alcohol</th>
          </tr>
        </thead>
        <tbody>
          ${philpen.filter(p => new Date(p.created_at || p.record_date || "") >= currentMonday).length === 0
            ? '<tr><td colspan="6" class="text-center">No PhilPen assessments recorded in current week.</td></tr>'
            : philpen.filter(p => new Date(p.created_at || p.record_date || "") >= currentMonday).map(p => `
              <tr>
                <td>${p.record_date || new Date(p.created_at).toLocaleDateString()}</td>
                <td class="font-bold">${p.full_name || p.residents?.full_name || "—"}</td>
                <td>${p.address_sitio || p.residents?.sitio || "Subukin"}</td>
                <td class="font-bold">${p.bp || "—"}</td>
                <td>${p.bmi || "—"}</td>
                <td>${p.smokes ? "Smoker" : "Non-smoker"} / ${p.drinks_alcohol ? "Alcohol user" : "No alcohol"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_PhilPen_Risk_Assessment_Report.html",
      content: getHtmlTemplate("Weekly PhilPen NCD Risk Screening Report", "Barangay Subukin Health Center", weeklyPhilpenContent)
    });

    // Weekly Dengue
    const weeklyDengueContent = `
      <div class="meta-bar">
        <div>Current Week Inspections: <strong>${dengue.filter(d => new Date(d.created_at || "") >= currentMonday).length}</strong></div>
        <div>Total Inspections: <strong>${dengue.length}</strong></div>
      </div>
      <div class="section-title">Active Week Dengue Larval Inspection Records</div>
      <table>
        <thead>
          <tr>
            <th>Household Head Name</th>
            <th>Container Type</th>
            <th class="text-center">Larvae Status</th>
            <th>Action Plan / Eradication</th>
          </tr>
        </thead>
        <tbody>
          ${dengue.filter(d => new Date(d.created_at || "") >= currentMonday).length === 0
            ? '<tr><td colspan="4" class="text-center">No dengue inspection records in current week.</td></tr>'
            : dengue.filter(d => new Date(d.created_at || "") >= currentMonday).map(d => `
              <tr>
                <td class="font-bold">${d.household_name || "—"}</td>
                <td>${d.container_type || "—"}</td>
                <td class="text-center">${d.has_larvae ? '<span class="tag tag-danger font-bold">POSITIVE (Larvae Found)</span>' : '<span class="tag tag-success">NEGATIVE (Clean)</span>'}</td>
                <td>${d.action_plan || "Water replaced & cleaned"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_Dengue_Prevention_Report.html",
      content: getHtmlTemplate("Weekly Dengue Larval Surveillance Report", "Barangay Subukin Health Center", weeklyDengueContent)
    });

    // Weekly Maternal
    const weeklyMaternalContent = `
      <div class="meta-bar">
        <div>Current Week Maternal Records: <strong>${maternal.filter(m => new Date(m.created_at || "") >= currentMonday).length}</strong></div>
        <div>All-time Maternal Records: <strong>${maternal.length}</strong></div>
      </div>
      <div class="section-title">Active Week Maternal & Prenatal Checkups</div>
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Family #</th>
            <th>Age</th>
            <th>Sitio</th>
            <th>EDC</th>
            <th>Obstetric / FPAL</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${maternal.filter(m => new Date(m.created_at || "") >= currentMonday).length === 0
            ? '<tr><td colspan="7" class="text-center">No maternal care checkups recorded in current week.</td></tr>'
            : maternal.filter(m => new Date(m.created_at || "") >= currentMonday).map(m => `
              <tr>
                <td class="font-bold">${m.patient_name || `${m.patient_first_name || ""} ${m.patient_last_name || ""}`.trim() || "—"}</td>
                <td>${m.family_number || "—"}</td>
                <td>${m.age || "—"}</td>
                <td>${m.sitio || "Subukin"}</td>
                <td>${m.edc || "—"}</td>
                <td>${m.obstetric_score || "—"} ${m.fpal ? `(${m.fpal})` : ""}</td>
                <td>${m.remarks || "—"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_Maternal_Care_Report.html",
      content: getHtmlTemplate("Weekly Maternal & Prenatal Health Report", "Barangay Subukin Health Center", weeklyMaternalContent)
    });

    // Weekly Child Health
    const weeklyChildContent = `
      <div class="meta-bar">
        <div>Current Week Child Records: <strong>${child.filter(c => new Date(c.created_at || "") >= currentMonday).length}</strong></div>
        <div>All-time Child Records: <strong>${child.length}</strong></div>
      </div>
      <div class="section-title">Active Week Child Health & Immunization Entries</div>
      <table>
        <thead>
          <tr>
            <th>Child Patient Name</th>
            <th>Parent / Guardian</th>
            <th>Birthday / Age</th>
            <th>Category / Program</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${child.filter(c => new Date(c.created_at || "") >= currentMonday).length === 0
            ? '<tr><td colspan="5" class="text-center">No child health records recorded in current week.</td></tr>'
            : child.filter(c => new Date(c.created_at || "") >= currentMonday).map(c => `
              <tr>
                <td class="font-bold">${c.child_name || `${c.first_name || ""} ${c.surname || ""}`.trim() || "—"}</td>
                <td>${c.parent_guardian_name || c.mother_name || "—"}</td>
                <td>${c.birthday || "—"} (${c.age_months ? `${c.age_months} mos` : "—"})</td>
                <td>${c.form_type || "Sick Children / Vit A"}</td>
                <td>${c.remarks || "—"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_Child_Health_Report.html",
      content: getHtmlTemplate("Weekly Child Health & Immunization Report", "Barangay Subukin Health Center", weeklyChildContent)
    });

    // Weekly Family Planning
    const weeklyFPContent = `
      <div class="meta-bar">
        <div>Current Week FP Visits: <strong>${familyPlanning.filter(f => new Date(f.created_at || f.start_date || "") >= currentMonday).length}</strong></div>
        <div>Total FP Clients: <strong>${familyPlanning.length}</strong></div>
      </div>
      <div class="section-title">Active Week Family Planning Consultations</div>
      <table>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Family #</th>
            <th>Sitio</th>
            <th>Method Currently Used</th>
            <th>Start / Drop-out Date</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${familyPlanning.filter(f => new Date(f.created_at || f.start_date || "") >= currentMonday).length === 0
            ? '<tr><td colspan="6" class="text-center">No family planning consultations in current week.</td></tr>'
            : familyPlanning.filter(f => new Date(f.created_at || f.start_date || "") >= currentMonday).map(f => `
              <tr>
                <td class="font-bold">${f.residents?.full_name || "—"}</td>
                <td>${f.residents?.family_number || "—"}</td>
                <td>${f.residents?.sitio || "Subukin"}</td>
                <td><span class="tag tag-info font-bold">${f.method || "—"}</span></td>
                <td>${f.start_date || "—"}</td>
                <td>${f.remarks || "—"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "01_Weekly_Health_Reports",
      filename: "Weekly_Family_Planning_Report.html",
      content: getHtmlTemplate("Weekly Family Planning Services Report", "Barangay Subukin Health Center", weeklyFPContent)
    });

    // ==========================================
    // 02. OFFICIAL PRINTABLE LEDGERS (HTML)
    // ==========================================

    // Master Resident Registry Ledger
    const residentLedgerContent = `
      <div class="meta-bar">
        <div>Total Registered Residents: <strong>${residents.length}</strong></div>
        <div>Sitios Covered: <strong>${Array.from(new Set(residents.map(r => r.sitio || "Centro"))).length} Sitios</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Full Name</th>
            <th>Family #</th>
            <th>Sitio</th>
            <th class="text-center">Gender</th>
            <th class="text-center">Age</th>
            <th>Civil Status</th>
            <th>Contact #</th>
          </tr>
        </thead>
        <tbody>
          ${residents.map((r, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td class="font-bold">${r.full_name || "—"}</td>
              <td class="font-mono">${r.family_number || "—"}</td>
              <td>${r.sitio || "Subukin"}</td>
              <td class="text-center">${r.gender || "—"}</td>
              <td class="text-center">${r.age || "—"}</td>
              <td>${r.civil_status || "—"}</td>
              <td>${r.contact_number || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Master_Resident_Directory_Ledger.html",
      content: getHtmlTemplate("Official Master Resident Demographics Directory", "Barangay Subukin Health Registry", residentLedgerContent, true)
    });

    // Master Family Data Census Ledger
    const familyLedgerContent = `
      <div class="meta-bar">
        <div>Total Household Families: <strong>${familyData.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center">Family # (FN)</th>
            <th>Household Head (Father)</th>
            <th>Mother's Name</th>
            <th>Sitio</th>
            <th class="text-center">Households</th>
            <th class="text-center">Males</th>
            <th class="text-center">Females</th>
            <th class="text-center">Total Members</th>
          </tr>
        </thead>
        <tbody>
          ${familyData.map(f => `
            <tr>
              <td class="font-mono font-bold text-center">${f.family_number || "—"}</td>
              <td class="font-bold">${f.father_name || "—"}</td>
              <td>${f.mother_name || "—"}</td>
              <td>${f.sitio || "Centro"}</td>
              <td class="text-center">${f.num_households || 1}</td>
              <td class="text-center">${f.num_males || 0}</td>
              <td class="text-center">${f.num_females || 0}</td>
              <td class="text-center font-bold">${f.total_members || 0}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Family_Data_Census_Master_Ledger.html",
      content: getHtmlTemplate("Official Family Data Census Master Ledger Sheet", "Barangay Subukin Health Center", familyLedgerContent, true)
    });

    // Medical Consultation Records Ledger
    const consLedgerContent = `
      <div class="meta-bar">
        <div>Total Consultations Recorded: <strong>${consultations.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Date</th>
            <th>Patient Name</th>
            <th>Sitio</th>
            <th>Age/Sex</th>
            <th>Chief Complaint / Cause</th>
            <th>Temperature</th>
            <th>Pulse Rate</th>
            <th>Weight / Height</th>
          </tr>
        </thead>
        <tbody>
          ${consultations.map((c, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td>${c.consultation_date || new Date(c.created_at).toLocaleDateString()}</td>
              <td class="font-bold">${c.residents?.full_name || "—"}</td>
              <td>${c.sitio || c.residents?.sitio || "Subukin"}</td>
              <td>${c.residents?.age ? `${c.residents.age}y` : "—"} / ${c.residents?.gender || "—"}</td>
              <td>${c.consultation_cause || "—"}</td>
              <td>${c.temperature ? `${c.temperature}°C` : "—"}</td>
              <td>${c.pulse_rate || "—"}</td>
              <td>${c.weight ? `${c.weight} kg` : "—"} / ${c.height ? `${c.height} cm` : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Consultation_Records_Ledger.html",
      content: getHtmlTemplate("Official Medical Consultation Records Ledger", "Barangay Subukin Health Center", consLedgerContent, true)
    });

    // PhilPen Risk Ledger
    const philpenLedgerContent = `
      <div class="meta-bar">
        <div>Total PhilPen Screenings: <strong>${philpen.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Date</th>
            <th>Resident Name</th>
            <th>Sitio</th>
            <th>Age/Sex</th>
            <th>BP</th>
            <th>BMI</th>
            <th>Tobacco / Alcohol</th>
            <th>Blood Sugar / Chol</th>
          </tr>
        </thead>
        <tbody>
          ${philpen.map((p, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td>${p.record_date || new Date(p.created_at).toLocaleDateString()}</td>
              <td class="font-bold">${p.full_name || p.residents?.full_name || "—"}</td>
              <td>${p.address_sitio || p.residents?.sitio || "Subukin"}</td>
              <td>${p.age || p.residents?.age || "—"} / ${p.gender || p.residents?.gender || "—"}</td>
              <td class="font-bold">${p.bp || "—"}</td>
              <td>${p.bmi || "—"}</td>
              <td>${p.smokes ? "Smoker" : "Non-smoker"} / ${p.drinks_alcohol ? "Alcohol" : "No alcohol"}</td>
              <td>${p.fbs ? `FBS: ${p.fbs}` : "—"} / ${p.cholesterol ? `Chol: ${p.cholesterol}` : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_PhilPen_Health_Ledger.html",
      content: getHtmlTemplate("Official PhilPen NCD Risk Screening Master Ledger", "Barangay Subukin Health Center", philpenLedgerContent, true)
    });

    // Dengue Inspection Ledger
    const dengueLedgerContent = `
      <div class="meta-bar">
        <div>Total Inspections Recorded: <strong>${dengue.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Date Recorded</th>
            <th>Household Head</th>
            <th>Container Type</th>
            <th class="text-center">Larvae Status</th>
            <th>Action Plan / Eradication Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${dengue.map((d, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td>${new Date(d.created_at).toLocaleDateString()}</td>
              <td class="font-bold">${d.household_name || "—"}</td>
              <td>${d.container_type || "—"}</td>
              <td class="text-center">${d.has_larvae ? '<span class="tag tag-danger font-bold">POSITIVE</span>' : '<span class="tag tag-success">NEGATIVE</span>'}</td>
              <td>${d.action_plan || "Cleaned & drained"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Dengue_Prevention_Inspection_Ledger.html",
      content: getHtmlTemplate("Official Dengue Larval Inspection Surveillance Ledger", "Barangay Subukin Health Center", dengueLedgerContent, true)
    });

    // Maternal Care Ledger
    const maternalLedgerContent = `
      <div class="meta-bar">
        <div>Total Maternal Records: <strong>${maternal.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Patient Name</th>
            <th>Family #</th>
            <th>Age</th>
            <th>Sitio</th>
            <th>EDC</th>
            <th>Obstetric / FPAL</th>
            <th>Clinical Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${maternal.map((m, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td class="font-bold">${m.patient_name || `${m.patient_first_name || ""} ${m.patient_last_name || ""}`.trim() || "—"}</td>
              <td class="font-mono">${m.family_number || "—"}</td>
              <td>${m.age ? `${m.age}y` : "—"}</td>
              <td>${m.sitio || "Subukin"}</td>
              <td>${m.edc || "—"}</td>
              <td>${m.obstetric_score || "—"} ${m.fpal ? `(${m.fpal})` : ""}</td>
              <td>${m.remarks || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Maternal_Care_Prenatal_Ledger.html",
      content: getHtmlTemplate("Official Maternal Care & Prenatal Health Records Ledger", "Barangay Subukin Health Center", maternalLedgerContent, true)
    });

    // Child Health Ledger
    const childLedgerContent = `
      <div class="meta-bar">
        <div>Total Child Health Entries: <strong>${child.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Child Patient Name</th>
            <th>Parent / Guardian</th>
            <th>Birthday / Age</th>
            <th>Form Category</th>
            <th>Assessment / Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${child.map((c, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td class="font-bold">${c.child_name || `${c.first_name || ""} ${c.surname || ""}`.trim() || "—"}</td>
              <td>${c.parent_guardian_name || c.mother_name || "—"}</td>
              <td>${c.birthday || "—"} (${c.age_months ? `${c.age_months} mos` : "—"})</td>
              <td>${c.form_type || "Sick Children / Vit A / SIA"}</td>
              <td>${c.remarks || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Child_Health_Immunization_Ledger.html",
      content: getHtmlTemplate("Official Child Health, Nutrition & Immunization Ledger", "Barangay Subukin Health Center", childLedgerContent, true)
    });

    // Family Planning Ledger
    const fpLedgerContent = `
      <div class="meta-bar">
        <div>Total Family Planning Clients: <strong>${familyPlanning.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:30px;">#</th>
            <th>Client Name</th>
            <th>Family #</th>
            <th>Sitio</th>
            <th>Method</th>
            <th>Start Date</th>
            <th>Drop-out Date</th>
            <th>Clinical Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${familyPlanning.map((f, i) => `
            <tr>
              <td class="text-center font-mono">${i + 1}</td>
              <td class="font-bold">${f.residents?.full_name || "—"}</td>
              <td class="font-mono">${f.residents?.family_number || "—"}</td>
              <td>${f.residents?.sitio || "Subukin"}</td>
              <td class="font-bold">${f.method || "—"}</td>
              <td>${f.start_date || "—"}</td>
              <td>${f.drop_out_date || "—"}</td>
              <td>${f.remarks || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    files.push({
      folder: "02_Official_Printable_Ledgers",
      filename: "Printable_Family_Planning_FPForm1_Ledger.html",
      content: getHtmlTemplate("Official Family Planning Records Ledger (FP Form 1)", "Barangay Subukin Health Center", fpLedgerContent, true)
    });

    // ==========================================
    // 03. ADMIN UPDATES & AUDIT LOGS (HTML)
    // ==========================================

    // Activity Logs
    const activityContent = `
      <div class="meta-bar">
        <div>Total System Activities Logged: <strong>${activityLogs.length}</strong></div>
        <div>Audited Entity: <strong>Barangay Subukin Health Records System</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action Type</th>
            <th>User Role</th>
            <th>Details / Description</th>
          </tr>
        </thead>
        <tbody>
          ${activityLogs.length === 0
            ? '<tr><td colspan="4" class="text-center">No recent activity logs recorded.</td></tr>'
            : activityLogs.map(a => `
              <tr>
                <td class="font-mono">${a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</td>
                <td><span class="tag tag-info font-bold">${a.action || "UPDATE"}</span></td>
                <td>${a.user_email || a.user_role || "BHW"}</td>
                <td>${typeof a.details === "object" ? JSON.stringify(a.details) : (a.details || a.description || "—")}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "03_Admin_Updates_and_Audit_Logs",
      filename: "Admin_Activity_Logs_and_System_Updates.html",
      content: getHtmlTemplate("Official Admin Audit Trail & System Activity Logs", "Barangay Subukin Health Center", activityContent, true)
    });

    // Backup & Recovery History
    const backupHistoryContent = `
      <div class="meta-bar">
        <div>Configured Auto Schedules: <strong>${backupSchedules.length}</strong></div>
        <div>Recorded Backups: <strong>${pastBackupsMeta.length}</strong></div>
      </div>
      <div class="section-title">Active Automatic Backup Schedules</div>
      <table>
        <thead>
          <tr>
            <th>Schedule Name</th>
            <th>Frequency</th>
            <th>Scope</th>
            <th>Status</th>
            <th>Last Run</th>
            <th>Next Scheduled Run</th>
          </tr>
        </thead>
        <tbody>
          ${backupSchedules.length === 0
            ? '<tr><td colspan="6" class="text-center">No automatic backup schedules configured.</td></tr>'
            : backupSchedules.map((s: any) => `
              <tr>
                <td class="font-bold">${s.name || "System Auto Backup"}</td>
                <td>${s.frequency || "Weekly"}</td>
                <td>${s.scope || "Full Database"}</td>
                <td><span class="tag tag-success font-bold">${s.enabled ? "ACTIVE" : "PAUSED"}</span></td>
                <td>${s.lastRun ? new Date(s.lastRun).toLocaleString() : "Pending first run"}</td>
                <td>${s.nextRun ? new Date(s.nextRun).toLocaleString() : "—"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "03_Admin_Updates_and_Audit_Logs",
      filename: "System_Backup_and_Recovery_History.html",
      content: getHtmlTemplate("System Backup Configuration & Recovery Status Report", "Barangay Subukin Health Center", backupHistoryContent)
    });

    // Health Workers Directory
    const workersContent = `
      <div class="meta-bar">
        <div>Total Health Workers & Staff: <strong>${workers.length}</strong></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Role / Designation</th>
            <th>Assigned Sitio(s)</th>
            <th>Contact / Email</th>
          </tr>
        </thead>
        <tbody>
          ${workers.length === 0
            ? '<tr><td colspan="4" class="text-center">No health worker profiles registered.</td></tr>'
            : workers.map(w => `
              <tr>
                <td class="font-bold">${w.full_name || "—"}</td>
                <td><span class="tag tag-info">${w.role || "Barangay Health Worker"}</span></td>
                <td>${w.assigned_sitio || w.sitio || "Subukin Centrals"}</td>
                <td>${w.email || w.phone || "—"}</td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;
    files.push({
      folder: "03_Admin_Updates_and_Audit_Logs",
      filename: "Health_Workers_Directory_and_Assignments.html",
      content: getHtmlTemplate("Official Barangay Health Personnel & Sitio Directory", "Barangay Subukin Health Center", workersContent)
    });

    // ==========================================
    // 04. RAW DATA BACKUPS (JSON)
    // ==========================================
    const fullDatabaseBackup = {
      exported_at: now.toISOString(),
      system_name: "Barangay Subukin Health Records System",
      export_version: "2.0",
      total_tables: 8,
      residents,
      consultations,
      family_data: familyData,
      dengue_prevention: dengue,
      philpen_health: philpen,
      maternal_care: maternal,
      child_health: child,
      family_planning: familyPlanning,
      custom_forms: customForms,
      custom_submissions: customSubmissions,
      activity_logs: activityLogs,
      backup_schedules: backupSchedules,
      health_workers: workers
    };

    files.push({
      folder: "04_Raw_Data_Backups_JSON",
      filename: "complete_database_backup.json",
      content: JSON.stringify(fullDatabaseBackup, null, 2),
      type: "application/json"
    });

    files.push({
      folder: "04_Raw_Data_Backups_JSON",
      filename: "system_summary_metadata.json",
      content: JSON.stringify({
        generated_at: now.toISOString(),
        generated_by: "Admin Panel / Supervisor",
        barangay: "Subukin",
        municipality: "San Juan",
        province: "Batangas",
        counts: {
          residents: residents.length,
          consultations: consultations.length,
          families: familyData.length,
          dengue: dengue.length,
          philpen: philpen.length,
          maternal: maternal.length,
          child: child.length,
          family_planning: familyPlanning.length,
          custom_forms: customForms.length
        }
      }, null, 2),
      type: "application/json"
    });

    // ==========================================
    // SAVE DIRECTLY TO DEVICE FOLDER
    // ==========================================

    // Check if File System Access API is supported (Direct Folder saving on user device)
    if ("showDirectoryPicker" in window) {
      try {
        log("Prompting for device folder destination...");
        const rootHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
          startIn: "downloads"
        });

        log("Creating report folder on device...");
        const reportFolderHandle = await rootHandle.getDirectoryHandle(folderRootName, { create: true });

        // Cache subfolder handles
        const subfolderHandles: Record<string, any> = {};

        for (const file of files) {
          let targetDirHandle = reportFolderHandle;
          if (file.folder) {
            if (!subfolderHandles[file.folder]) {
              subfolderHandles[file.folder] = await reportFolderHandle.getDirectoryHandle(file.folder, { create: true });
            }
            targetDirHandle = subfolderHandles[file.folder];
          }

          const fileHandle = await targetDirHandle.getFileHandle(file.filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(file.content);
          await writable.close();
        }

        log(`Full report package saved into folder: ${folderRootName}`);
        return { success: true, method: "filesystem" };
      } catch (fsErr: any) {
        // If user cancelled directory picker, throw or fallback to ZIP download
        if (fsErr.name === "AbortError") {
          log("Directory selection was cancelled. Packaging into downloadable archive folder...");
        } else {
          console.warn("Direct folder write failed, falling back to ZIP archive:", fsErr);
        }
      }
    }

    // Fallback: Generate structured ZIP archive containing exact same folders & files
    log("Creating structured report ZIP package...");
    const zip = new JSZip();
    const rootZip = zip.folder(folderRootName) || zip;

    for (const file of files) {
      if (file.folder) {
        const sub = rootZip.folder(file.folder);
        if (sub) sub.file(file.filename, file.content);
      } else {
        rootZip.file(file.filename, file.content);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderRootName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log("Report archive successfully downloaded!");
    return { success: true, method: "zip" };
  } catch (err: any) {
    console.error("Failed to generate full report folder:", err);
    return { success: false, method: "zip", error: err?.message || "Unknown error" };
  }
};
