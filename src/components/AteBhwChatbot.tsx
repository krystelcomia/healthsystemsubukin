import React, { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  HelpCircle, 
  Users, 
  MapPin, 
  Phone, 
  Activity, 
  FileText, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  HeartHandshake, 
  Search, 
  Calendar, 
  Shield, 
  ChevronRight,
  Stethoscope,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { SUBUKIN_SITIOS, getAssignedSitio } from "@/lib/sitioMapping";

// Custom Icon for Ate BHW - Friendly Barangay Health Worker Avatar
export const AteBhwIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 36 36" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Soft Glow */}
      <circle cx="18" cy="18" r="17" fill="currentColor" fillOpacity="0.12" />
      
      {/* BHW Health Cap with Medical Cross */}
      <path 
        d="M10 12C10 9 13.5 7 18 7C22.5 7 26 9 26 12L24.5 15H11.5L10 12Z" 
        fill="#FFFFFF" 
        stroke="#0284C7" 
        strokeWidth="1.2" 
      />
      {/* Cap Green Health Cross */}
      <rect x="17.2" y="9.5" width="1.6" height="4" rx="0.5" fill="#16A34A" />
      <rect x="16" y="10.7" width="4" height="1.6" rx="0.5" fill="#16A34A" />

      {/* Head / Face */}
      <circle cx="18" cy="18" r="6.5" fill="#FED7AA" stroke="#EA580C" strokeWidth="1" />
      
      {/* Hair Bangs */}
      <path 
        d="M12 16.5C12.5 14 15 13.5 18 13.5C21 13.5 23.5 14 24 16.5C23 15 20.5 14.5 18 14.5C15.5 14.5 13 15 12 16.5Z" 
        fill="#451A03" 
      />
      
      {/* Friendly Eyes */}
      <circle cx="15.5" cy="17.5" r="0.9" fill="#1E293B" />
      <circle cx="20.5" cy="17.5" r="0.9" fill="#1E293B" />
      
      {/* Rosy Cheeks */}
      <circle cx="14" cy="19.5" r="1.1" fill="#FCA5A5" fillOpacity="0.6" />
      <circle cx="22" cy="19.5" r="1.1" fill="#FCA5A5" fillOpacity="0.6" />
      
      {/* Welcoming Smile */}
      <path d="M16 20.5C16.5 21.8 19.5 21.8 20 20.5" stroke="#9A3412" strokeWidth="1" strokeLinecap="round" />

      {/* Stethoscope around Neck */}
      <path 
        d="M13.5 24.5C13.5 26.5 15 28 18 28C21 28 22.5 26.5 22.5 24.5" 
        stroke="#0284C7" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        fill="none" 
      />
      {/* Stethoscope Chest Piece */}
      <circle cx="18" cy="29.2" r="1.5" fill="#38BDF8" stroke="#0369A1" strokeWidth="1" />

      {/* Shoulders / Uniform */}
      <path 
        d="M8 32C8 27.5 12.5 25 18 25C23.5 25 28 27.5 28 32" 
        stroke="#0284C7" 
        strokeWidth="1.5" 
        fill="#E0F2FE" 
      />
    </svg>
  );
};

// Verified Coordinates & Location Details for the 11 Sitios of Barangay Subukin
export const SITIO_DETAILS: Record<string, {
  coords: string;
  location: string;
  landmarks: string;
  assignedBhw: string;
  contact: string;
}> = {
  "Sitio Cama": {
    coords: "13.7200° N, 121.4360° E",
    location: "Western coastal plain of Barangay Subukin bordering adjacent agricultural fields.",
    landmarks: "Near coastal fish landing and Sitio Cama access pathway.",
    assignedBhw: "Mercy O. Abanilla",
    contact: "0949-7768-394"
  },
  "Sitio Makalintal 1": {
    coords: "13.7215° N, 121.4385° E",
    location: "Central-southern residential sector along the main Makalintal thoroughfare.",
    landmarks: "Makalintal 1 Community Chapel and central barangay road access.",
    assignedBhw: "Suzette B. Lopez",
    contact: "0935-2008-942"
  },
  "Sitio Makalintal 2": {
    coords: "13.7225° N, 121.4395° E",
    location: "Eastern extension of Makalintal corridor connecting towards the shore.",
    landmarks: "Near Makalintal boundary marker and residential cluster.",
    assignedBhw: "Renchie V. Ilao",
    contact: "0965-6627-031"
  },
  "Sitio Maligaya": {
    coords: "13.7240° N, 121.4375° E",
    location: "North-central zone of Subukin, dense residential and farming community.",
    landmarks: "Maligaya Basketball Court and Sitio community hall.",
    assignedBhw: "Cecilia G. Benosa",
    contact: "0921-8509-320"
  },
  "Sitio Manggahan 1": {
    coords: "13.7255° N, 121.4355° E",
    location: "Northwestern sector known for historic mango groves and fruit orchards.",
    landmarks: "Old Manggahan grove and northern farm-to-market road.",
    assignedBhw: "Evelyn T. Ilao",
    contact: "0935-5638-247"
  },
  "Sitio Manggahan 2": {
    coords: "13.7265° N, 121.4345° E",
    location: "Far northwestern boundary of Barangay Subukin extending towards adjacent upland.",
    landmarks: "Manggahan upper pathway and hillside orchard boundaries.",
    assignedBhw: "Nenita M. Dimaculangan",
    contact: "0985-1225-857"
  },
  "Sitio Masaya": {
    coords: "13.7235° N, 121.4330° E",
    location: "Western residential sector adjacent to agricultural plantation zones.",
    landmarks: "Masaya community outpost and western irrigation canal.",
    assignedBhw: "Wilma D. Tanyag",
    contact: "0997-4971-138"
  },
  "Sitio Masigla": {
    coords: "13.7220° N, 121.4350° E",
    location: "South-central zone near main entrance access to Barangay Subukin.",
    landmarks: "Barangay Welcome Marker and Masigla community center.",
    assignedBhw: "Cristeta R. Lanuza (Supervisory) & Maribel M. Abayon (BNS)",
    contact: "0919-6980-712"
  },
  "Sitio Matahimik / Burol": {
    coords: "13.7250° N, 121.4410° E",
    location: "Elevated ridge/hill (Burol) overlooking the eastern bay view.",
    landmarks: "Burol viewing ridge and northeastern trail.",
    assignedBhw: "Renalyn D. Laurante",
    contact: "0985-1086-472"
  },
  "Sitio Matahimik / Punta": {
    coords: "13.7245° N, 121.4425° E",
    location: "Easternmost coastal point (Punta) directly facing Tayabas Bay.",
    landmarks: "Punta shoreline, fishing outposts, and coastal breakwater.",
    assignedBhw: "Merlita R. Alonzo",
    contact: "0930-9085-713"
  },
  "Sitio Puntor": {
    coords: "13.7210° N, 121.4415° E",
    location: "Southeastern coastal zone with mangrove fringes along Tayabas Bay.",
    landmarks: "Puntor coastal path, boat mooring, and beach line.",
    assignedBhw: "Amelita R. Sayat",
    contact: "0931-0232-973"
  },
  "Subukin Main / Health Center": {
    coords: "13.72335° N, 121.44059° E",
    location: "Official Barangay Hall & Primary Health Center compound, San Juan, Batangas.",
    landmarks: "Barangay Subukin Hall, Health Center, Daycare, and Plaza.",
    assignedBhw: "Mary Jane Landicho (Barangay Midwife)",
    contact: "0912-345-6789"
  }
};

export const BHW_PERSONNEL_LIST = [
  { name: "Mary Jane Landicho", role: "Barangay Midwife", phone: "0912-345-6789", sitio: "Subukin Main / Center", email: "maryjane.landicho@gmail.com" },
  { name: "Cristeta R. Lanuza", role: "BHW Supervisory", phone: "0919-6980-712", sitio: "Masigla", email: "cristeta.lanuza@gmail.com" },
  { name: "Maribel M. Abayon", role: "Barangay Nutrition Scholar (BNS)", phone: "0922-6722-134", sitio: "Masigla", email: "maribel.abayon@gmail.com" },
  { name: "Krystel Comia", role: "BHW Officer / Health Staff", phone: "0912-345-6789", sitio: "Maligaya", email: "krystel.comia@gmail.com" },
  { name: "Evelyn T. Ilao", role: "Barangay Health Worker", phone: "0935-5638-247", sitio: "Manggahan 1", email: "evelyn.ilao@gmail.com" },
  { name: "Cecilia G. Benosa", role: "Barangay Health Worker", phone: "0921-8509-320", sitio: "Maligaya", email: "cecilia.benosa@gmail.com" },
  { name: "Merlita R. Alonzo", role: "Barangay Health Worker", phone: "0930-9085-713", sitio: "Matahimik / Punta", email: "merlita.alonzo@gmail.com" },
  { name: "Suzette B. Lopez", role: "Barangay Health Worker", phone: "0935-2008-942", sitio: "Makalintal 1", email: "suzette.lopez@gmail.com" },
  { name: "Amelita R. Sayat", role: "Barangay Health Worker", phone: "0931-0232-973", sitio: "Puntor", email: "amelita.sayat@gmail.com" },
  { name: "Wilma D. Tanyag", role: "Barangay Health Worker", phone: "0997-4971-138", sitio: "Masaya", email: "wilma.tanyag@gmail.com" },
  { name: "Nenita M. Dimaculangan", role: "Barangay Health Worker", phone: "0985-1225-857", sitio: "Manggahan 2", email: "nenita.dimaculangan@gmail.com" },
  { name: "Mercy O. Abanilla", role: "Barangay Health Worker", phone: "0949-7768-394", sitio: "Cama", email: "mercy.abanilla@gmail.com" },
  { name: "Renchie V. Ilao", role: "Barangay Health Worker", phone: "0965-6627-031", sitio: "Makalintal 2", email: "renchie.ilao@gmail.com" },
  { name: "Renalyn D. Laurante", role: "Barangay Health Worker", phone: "0985-1086-472", sitio: "Matahimik / Burol", email: "renalyn.laurante@gmail.com" }
];

export const FAQ_QUESTIONS = [
  { id: "totals", label: "📊 Kabuuang Bilang ng Records", query: "Ilan ang kabuuang bilang ng records sa buong sistema?" },
  { id: "sitios", label: "📍 Lokasyon ng mga Sitio", query: "Saan matatagpuan ang mga Sitio sa Barangay Subukin at ano ang kanilang coordinates?" },
  { id: "bhw", label: "👩‍⚕️ Direktoryo at Contact ng BHW", query: "Sino-sino ang mga BHW at ano ang kanilang contact number at itinalagang sitio?" },
  { id: "resident_summary", label: "👤 Buod ng Talaan ng Residente", query: "Paano ko makikita ang summary o buod ng talaan ng isang partikular na residente?" },
  { id: "emergency", label: "🚨 Emergency Hotlines sa San Juan", query: "Ano ang mga emergency hotline at contact numbers sa San Juan, Batangas?" },
  { id: "dengue", label: "🦟 Talaan ng Dengue Prevention", query: "Ilan ang naitalang inspeksyon sa Dengue Prevention Form?" },
  { id: "maternal_child", label: "🤰 Serbisyo sa Maternal at Child Care", query: "Ano ang mga serbisyong pangkalusugan para sa buntis at bata sa health center?" },
  { id: "clinic_hours", label: "🕒 Oras ng Health Center at Attendance", query: "Ano ang opisyal na clinic hours at paano gumagana ang attendance shift?" }
];

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  quickActions?: { label: string; query: string }[];
}

export function AteBhwChatbot() {
  const { language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFaqDrawer, setShowFaqDrawer] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "welcome-1",
        sender: "bot",
        text: language === "tl"
          ? "Kamusta! Ako si **Ate BHW**, ang iyong opisyal na Barangay Health Assistant para sa Barangay Subukin. 😊\n\nMay maitutulong ba ako tungkol sa:\n• **Kabuuang bilang ng mga talaan** (Residents, Consultations, Maternal, Dengue, atbp.)\n• **Buod ng rekord ng isang residente** (ilagay lang ang pangalan)\n• **Eksaktong lokasyon at coordinates ng bawat sitio**\n• **Contact details at assigned sitio ng mga BHW**\n\nMaaari kang pumili sa mga madalas itanong (FAQ) sa ibaba o direktang mag-type ng iyong katanungan!"
          : "Hello! I am **Ate BHW**, your official Barangay Health Assistant for Barangay Subukin. 😊\n\nHow can I help you today? You can ask me about:\n• **Total count of all health records** (Residents, Consultations, Maternal Care, Dengue, etc.)\n• **Summary of a specific resident's medical records** (just enter their name)\n• **Exact coordinates and locations of all Sitios**\n• **Contact details and assigned areas of our BHW workers**\n\nFeel free to tap any FAQ pill below or type your question!",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: [
          { label: "📊 Total Records", query: "Ilan ang kabuuang records sa sistema?" },
          { label: "📍 List of Sitios", query: "Ipakita ang listahan at lokasyon ng lahat ng Sitio" },
          { label: "👩‍⚕️ BHW Contacts", query: "Ipakita ang contact number ng mga BHW" }
        ]
      }
    ];
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnreadCount(0);
    }
  }, [messages, isOpen, isMinimized]);

  // Comprehensive Data Answering Engine
  const generateBotAnswer = async (userQuery: string): Promise<{ text: string; quickActions?: { label: string; query: string }[] }> => {
    const q = userQuery.toLowerCase().trim();

    // 1. TOTAL NUMBER OF RECORDS / SYSTEM STATISTICS
    if (
      q.includes("total") || 
      q.includes("bilang") || 
      q.includes("statistics") || 
      q.includes("stats") || 
      q.includes("ilan ang") || 
      q.includes("dami") || 
      q.includes("kabuuang") || 
      q.includes("how many") ||
      q.includes("summary of data") ||
      q.includes("records count")
    ) {
      try {
        const [
          resCount,
          famCount,
          consCount,
          matCount,
          childCount,
          fpCount,
          dengCount,
          philCount,
          workersCount
        ] = await Promise.all([
          supabase.from("residents").select("*", { count: "exact", head: true }),
          supabase.from("family_data").select("*", { count: "exact", head: true }),
          supabase.from("consultations").select("*", { count: "exact", head: true }),
          supabase.from("maternal_care" as any).select("*", { count: "exact", head: true }),
          supabase.from("child_health" as any).select("*", { count: "exact", head: true }),
          supabase.from("family_planning").select("*", { count: "exact", head: true }),
          supabase.from("dengue_prevention").select("*", { count: "exact", head: true }),
          supabase.from("philpen_health").select("*", { count: "exact", head: true }),
          supabase.from("bhw_workers").select("*", { count: "exact", head: true }),
        ]);

        const rawActivityLogs = JSON.parse(localStorage.getItem("bhw_activity_logs") || "[]");
        const rawAttendance = JSON.parse(localStorage.getItem("bhw_attendance_logs") || "[]");

        const rTotal = resCount.count ?? 0;
        const fTotal = famCount.count ?? 0;
        const cTotal = consCount.count ?? 0;
        const mTotal = matCount.count ?? 0;
        const chTotal = childCount.count ?? 0;
        const fpTotal = fpCount.count ?? 0;
        const dTotal = dengCount.count ?? 0;
        const pTotal = philCount.count ?? 0;
        const wTotal = (workersCount.count ?? 0) || BHW_PERSONNEL_LIST.length;
        const grandTotal = rTotal + fTotal + cTotal + mTotal + chTotal + fpTotal + dTotal + pTotal;

        const responseText = language === "tl"
          ? `Narito ang kasalukuyang **Opisyal na Estadistika ng Talaan** sa Barangay Subukin Health System:\n\n` +
            `📁 **Kabuuang Tala sa Database: ${grandTotal.toLocaleString()} mga rekord**\n\n` +
            `• 👥 **Mga Rehistradong Residente:** ${rTotal.toLocaleString()}\n` +
            `• 🏠 **Mga Pamilya / Household Census:** ${fTotal.toLocaleString()}\n` +
            `• 🩺 **Konsultasyon (Consultations):** ${cTotal.toLocaleString()}\n` +
            `• 🤰 **Maternal & Prenatal Care:** ${mTotal.toLocaleString()}\n` +
            `• 👶 **Kalusugan ng Bata (Child Health / Bakuna):** ${chTotal.toLocaleString()}\n` +
            `• 👨‍👩‍👧 **Family Planning Records:** ${fpTotal.toLocaleString()}\n` +
            `• 🦟 **Dengue Prevention Inspections:** ${dTotal.toLocaleString()}\n` +
            `• ❤️ **PhilPen NCD Screening:** ${pTotal.toLocaleString()}\n` +
            `• 👩‍⚕️ **Mga Kawani / BHW Workers:** ${wTotal}\n` +
            `• 📝 **Naitalang Activity Logs:** ${rawActivityLogs.length}\n` +
            `• 🕒 **Attendance Check-ins:** ${rawAttendance.length}\n\n` +
            `*Lahat ng datos na ito ay patuloy na naitatala at ligtas na nakaimbak sa opisyal na sistema ng Barangay Subukin.*`
          : `Here is the current **Official Records Statistics** in the Barangay Subukin Health System:\n\n` +
            `📁 **Grand Total System Records: ${grandTotal.toLocaleString()} entries**\n\n` +
            `• 👥 **Registered Residents:** ${rTotal.toLocaleString()}\n` +
            `• 🏠 **Households (Family Data):** ${fTotal.toLocaleString()}\n` +
            `• 🩺 **Clinical Consultations:** ${cTotal.toLocaleString()}\n` +
            `• 🤰 **Maternal & Prenatal Records:** ${mTotal.toLocaleString()}\n` +
            `• 👶 **Child Health & Immunization:** ${chTotal.toLocaleString()}\n` +
            `• 👨‍👩‍👧 **Family Planning Records:** ${fpTotal.toLocaleString()}\n` +
            `• 🦟 **Dengue Prevention Inspections:** ${dTotal.toLocaleString()}\n` +
            `• ❤️ **PhilPen NCD Risk Screenings:** ${pTotal.toLocaleString()}\n` +
            `• 👩‍⚕️ **Registered BHW Workers:** ${wTotal}\n` +
            `• 📝 **System Activity Audit Logs:** ${rawActivityLogs.length}\n` +
            `• 🕒 **Recorded Duty Shifts:** ${rawAttendance.length}\n\n` +
            `*All records are updated in real time from health worker forms and clinical visits.*`;

        return {
          text: responseText,
          quickActions: [
            { label: "📍 Listahan ng Sitios", query: "Saan ang mga Sitio?" },
            { label: "👩‍⚕️ BHW Directory", query: "Sino ang mga BHW?" },
            { label: "🦟 Dengue Stats", query: "Detalye ng Dengue Prevention" }
          ]
        };
      } catch (err) {
        return {
          text: "Paumanhin, nagkaroon ng sandaling pagkaantala sa pagbasa ng kabuuang tala. Pakisubukang muli sa ilang sandali."
        };
      }
    }

    // 2. SPECIFIC SITIO LOCATION OR GENERAL SITIO INQUIRY
    const matchedSitioKey = Object.keys(SITIO_DETAILS).find(k => 
      q.includes(k.toLowerCase()) || 
      q.includes(k.toLowerCase().replace("sitio ", ""))
    );

    if (matchedSitioKey) {
      const s = SITIO_DETAILS[matchedSitioKey];
      return {
        text: `📍 **Impormasyon at Lokasyon: ${matchedSitioKey}**\n\n` +
          `• **Eksaktong Coordinates:** \`${s.coords}\`\n` +
          `• **Lokasyon:** ${s.location}\n` +
          `• **Mahalagang Palatandaan (Landmarks):** ${s.landmarks}\n` +
          `• **Itinalagang BHW:** **${s.assignedBhw}**\n` +
          `• **Contact Number:** 📞 **${s.contact}**\n\n` +
          `May nais ka pa bang malaman tungkol sa ibang sitio o serbisyong pangkalusugan dito?`,
        quickActions: [
          { label: `📞 Kontakin si ${s.assignedBhw.split(" ")[0]}`, query: `Contact details ni ${s.assignedBhw}` },
          { label: "📍 Lahat ng 11 Sitios", query: "Ilista ang lahat ng Sitio ng Barangay Subukin" }
        ]
      };
    }

    if (q.includes("sitio") || q.includes("location") || q.includes("lokasyon") || q.includes("coordinates") || q.includes("saan matatagpuan")) {
      const sitioList = SUBUKIN_SITIOS.map((name, i) => {
        const detail = SITIO_DETAILS[`Sitio ${name}`] || SITIO_DETAILS[name];
        const coords = detail ? detail.coords : "Subukin Sector";
        const bhw = getAssignedSitio(name) || detail?.assignedBhw || "Barangay Health Staff";
        return `**${i + 1}. Sitio ${name}**\n   • Coords: \`${coords}\`\n   • BHW Assigned: **${bhw}**`;
      }).join("\n\n");

      return {
        text: `Ang **Barangay Subukin, San Juan, Batangas** (Coordinates: \`13.72335° N, 121.44059° E\`) ay may **11 Opisyal na Sitio**:\n\n${sitioList}\n\n*Maaari mong itanong ang partikular na pangalan ng sitio (hal. "Saan ang Sitio Maligaya?") para sa eksaktong palatandaan at contact.*`,
        quickActions: [
          { label: "📍 Sitio Maligaya", query: "Saan ang Sitio Maligaya?" },
          { label: "📍 Sitio Masigla", query: "Saan ang Sitio Masigla?" },
          { label: "📍 Sitio Punta", query: "Saan ang Sitio Matahimik Punta?" }
        ]
      };
    }

    // 3. BHW CONTACT DETAILS & PERSONNEL
    const matchedWorker = BHW_PERSONNEL_LIST.find(w => 
      q.includes(w.name.toLowerCase()) || 
      q.includes(w.name.toLowerCase().split(" ")[0]) ||
      q.includes(w.name.toLowerCase().split(" ").slice(-1)[0])
    );

    if (matchedWorker) {
      return {
        text: `👩‍⚕️ **BHW Profile at Contact Information:**\n\n` +
          `• **Pangalan:** **${matchedWorker.name}**\n` +
          `• **Tungkulin (Role):** ${matchedWorker.role}\n` +
          `• **Itinalagang Sitio / Area:** 📍 **${matchedWorker.sitio}**\n` +
          `• **Telepono / Mobile:** 📞 **${matchedWorker.phone}**\n` +
          `• **Email:** ✉️ \`${matchedWorker.email}\`\n\n` +
          `Kung may agarang pangangailangang medikal sa kanyang nasasakupan, maaari mo siyang direktang tawagan o i-text sa ibinigay na numero.`,
        quickActions: [
          { label: "👩‍⚕️ Lahat ng BHW", query: "Ipakita ang listahan ng lahat ng BHW" },
          { label: "🚨 Emergency Numbers", query: "Emergency numbers sa San Juan" }
        ]
      };
    }

    if (q.includes("bhw") || q.includes("worker") || q.includes("tauhan") || q.includes("midwife") || q.includes("supervisor") || q.includes("contact") || q.includes("telepono") || q.includes("direktoryo")) {
      const bhwListText = BHW_PERSONNEL_LIST.map((w, idx) => 
        `**${idx + 1}. ${w.name}** (${w.role})\n   • Sitio: **${w.sitio}**\n   • Telepono: 📞 **${w.phone}**`
      ).join("\n\n");

      return {
        text: `Narito ang **Direktoryo ng mga Tauhan ng Kalusugan (BHW Directory)** ng Barangay Subukin:\n\n${bhwListText}\n\n*Opisyal na Barangay Midwife:* **Mary Jane Landicho** (0912-345-6789)\n*BHW Supervisory:* **Cristeta R. Lanuza** (0919-6980-712)`,
        quickActions: [
          { label: "👩‍⚕️ Mary Jane Landicho", query: "Contact ni Mary Jane Landicho" },
          { label: "👩‍⚕️ Cristeta R. Lanuza", query: "Contact ni Cristeta R. Lanuza" },
          { label: "🚨 Emergency Hotlines", query: "Emergency Hotlines" }
        ]
      };
    }

    // 4. RESIDENT SPECIFIC RECORD SUMMARY / SEARCH
    if (
      q.includes("residente") || 
      q.includes("resident") || 
      q.includes("buod") || 
      q.includes("summary of") || 
      q.includes("rekord ni") || 
      q.includes("record of") || 
      q.includes("talaan ni") ||
      q.includes("pasyente") ||
      q.includes("patient") ||
      q.includes("sino si") ||
      q.includes("search")
    ) {
      // Extract possible name keywords
      const cleanSearch = q
        .replace("summary of", "")
        .replace("summary ni", "")
        .replace("buod ng", "")
        .replace("buod ni", "")
        .replace("residente", "")
        .replace("resident", "")
        .replace("rekord ni", "")
        .replace("rekord ng", "")
        .replace("record of", "")
        .replace("talaan ni", "")
        .replace("sino si", "")
        .replace("search", "")
        .trim();

      if (cleanSearch.length >= 2) {
        try {
          // Search in residents table
          const { data: matchedResidents } = await supabase
            .from("residents")
            .select("*")
            .ilike("full_name", `%${cleanSearch}%`)
            .limit(3);

          if (matchedResidents && matchedResidents.length > 0) {
            const r = matchedResidents[0];

            // Concurrently query related records for this resident
            const [consData, matData, childData, philData, famData] = await Promise.all([
              supabase.from("consultations").select("*").eq("resident_id", r.id).order("consultation_date", { ascending: false }).limit(5),
              supabase.from("maternal_care" as any).select("*").or(`resident_id.eq.${r.id},patient_name.ilike.%${cleanSearch}%`).limit(3),
              supabase.from("child_health" as any).select("*").or(`resident_id.eq.${r.id},child_name.ilike.%${cleanSearch}%`).limit(3),
              supabase.from("philpen_health").select("*").or(`resident_id.eq.${r.id},full_name.ilike.%${cleanSearch}%`).limit(3),
              supabase.from("family_data").select("*").or(`father_name.ilike.%${cleanSearch}%,mother_name.ilike.%${cleanSearch}%`).limit(1),
            ]);

            const consultations = consData.data || [];
            const maternal = (matData.data as any[]) || [];
            const childHealth = (childData.data as any[]) || [];
            const philpen = philData.data || [];
            const family = (famData.data || [])[0];

            let summaryText = `📋 **Buod ng Rekord ng Residente (Clinical Profile):**\n\n` +
              `• **Buong Pangalan:** **${r.full_name}**\n` +
              `• **Edad at Kasarian:** ${r.age || "—"} taong gulang • ${r.sex || "—"}\n` +
              `• **Kapanganakan:** ${r.birthdate ? new Date(r.birthdate).toLocaleDateString() : "—"}\n` +
              `• **Sitio Address:** 📍 **${r.sitio || "Subukin"}**\n` +
              `• **Katayuang Sibil:** ${r.civil_status || "—"}\n` +
              `• **Numero ng Telepono:** ${r.contact_number || "—"}\n` +
              `• **PhilHealth No.:** ${r.philhealth_number || "Wala / N/A"}\n\n`;

            if (family) {
              summaryText += `🏠 **Household & Family Profile:**\n` +
                `• Pamilya #: ${family.family_number || "—"}\n` +
                `• Ulo ng Pamilya: ${family.father_name || family.mother_name || "—"}\n\n`;
            }

            if (consultations.length > 0) {
              summaryText += `🩺 **Kamakailang Konsultasyon (${consultations.length}):**\n` +
                consultations.map((c: any) => 
                  `  - *${new Date(c.consultation_date).toLocaleDateString()}*: ${c.consultation_cause || "General Checkup"} (BP/Vitals: ${c.pulse_rate ? `PR ${c.pulse_rate}` : ""} ${c.temperature ? `Temp ${c.temperature}°C` : ""})`
                ).join("\n") + "\n\n";
            } else {
              summaryText += `🩺 **Konsultasyon:** Walang naitalang dating konsultasyon.\n\n`;
            }

            if (maternal.length > 0) {
              summaryText += `🤰 **Maternal Care Record:** May aktibong talaan ng pagbubuntis/prenatal checkup.\n\n`;
            }

            if (childHealth.length > 0) {
              summaryText += `👶 **Child Health & Immunization:** May naitalang bakuna at nutritional tracking.\n\n`;
            }

            if (philpen.length > 0) {
              const p = philpen[0];
              summaryText += `❤️ **PhilPen NCD Screening:** Naitalang BP: ${p.bp || "Normal"}, Blood Sugar: ${p.blood_sugar || "N/A"}.\n\n`;
            }

            summaryText += `*Kung nais mong i-update o tingnan ang buong rekord, pumunta sa pahina ng Resident Records.*`;

            return {
              text: summaryText,
              quickActions: [
                { label: "👥 Iba pang Residente", query: "Maghanap ng ibang residente" },
                { label: "📊 Kabuuang Records", query: "Ilan ang records sa sistema?" }
              ]
            };
          } else {
            return {
              text: `🔍 Walang nahanap na residente na tumutugma sa pangalang **"${cleanSearch}"** sa database ng Barangay Subukin.\n\nPaki-tiyak ang tamang baybay ng pangalan (hal. *"buod ni Juan Dela Cruz"*) o maaari mo ring i-check sa Resident Records page.`,
              quickActions: [
                { label: "📊 Tingnan ang Kabuuang Bilang", query: "Ilan ang mga residente sa barangay?" },
                { label: "📍 Listahan ng Sitio", query: "Ilista ang mga Sitio" }
              ]
            };
          }
        } catch (e) {
          return {
            text: `Nagkaroon ng problema sa paghahanap sa database para sa pangalang "${cleanSearch}". Pakisubukang muli.`
          };
        }
      } else {
        return {
          text: `Upang makita ang **buod o rekord ng isang residente**, mangyaring i-type ang kanyang buong pangalan o apelyido.\n\nHalimbawa: \n• *"Buod ng rekord ni Maria Santos"*\n• *"Ipakita ang rekord ni Dela Cruz"*`,
          quickActions: [
            { label: "📊 Ilan ang Residente?", query: "Ilan ang kabuuang residente?" }
          ]
        };
      }
    }

    // 5. EMERGENCY CONTACTS
    if (q.includes("emergency") || q.includes("sakuna") || q.includes("ambulansya") || q.includes("pulis") || q.includes("rescue") || q.includes("hospital") || q.includes("ospital")) {
      return {
        text: `🚨 **Mga Opisyal na Emergency Hotline (San Juan, Batangas):**\n\n` +
          `• **Pambansang Emergency Hotline:** 📞 **911**\n` +
          `• **Emergency Rescue (MDRRMO San Juan):** 📞 **0998-590-5102**\n` +
          `• **Ambulansya (Municipal Health):** 📞 **0905-669-927**\n` +
          `• **San Juan Municipal Police Station:** 📞 **0915-385-0205**\n` +
          `• **San Juan Fire Station (BFP):** 📞 **911 / MDRRMO**\n` +
          `• **San Juan District Hospital:** 📞 **(043) 633-3756**\n` +
          `• **San Juan Doctors' Hospital:** 📞 **(043) 575-3138**\n` +
          `• **Divine Care Hospital:** 📞 **(043) 420-0062**\n\n` +
          `*Para sa tulong sa barangay level, tawagan si Midwife Mary Jane Landicho sa 0912-345-6789 o si BHW Cristeta Lanuza sa 0919-6980-712.*`,
        quickActions: [
          { label: "👩‍⚕️ BHW Contacts", query: "BHW contact numbers" },
          { label: "📍 Health Center Location", query: "Saan ang Barangay Health Center?" }
        ]
      };
    }

    // 6. DENGUE INSPECTIONS
    if (q.includes("dengue") || q.includes("mosquito") || q.includes("lamok") || q.includes("larvae")) {
      try {
        const { count } = await supabase.from("dengue_prevention").select("*", { count: "exact", head: true });
        return {
          text: `🦟 **Dengue Prevention & Vector Surveillance Summary:**\n\n` +
            `• **Kabuuang Inspeksyon na Naitala:** **${(count || 0).toLocaleString()} kabahayan**\n` +
            `• **Programa:** 4S Strategy (Search & Destroy, Self-Protection, Seek Early Consultation, Say Yes to Fogging when needed).\n` +
            `• **Tagapangasiwa:** Lahat ng BHW sa kanilang 11 itinalagang Sitio.\n\n` +
            `Regular na sinusuri ng mga BHW ang mga drum, plorera, gulong, at mga lalagyan ng tubig upang masigurong walang kiti-kiti o larvae ng lamok.`,
          quickActions: [
            { label: "📊 Tingnan ang Lahat ng Records", query: "Kabuuang bilang ng records" }
          ]
        };
      } catch {
        return { text: "Aktibong naitatala ang mga inspeksyon laban sa Dengue sa lahat ng Sitio ng Barangay Subukin." };
      }
    }

    // 7. CLINIC HOURS & ATTENDANCE
    if (q.includes("oras") || q.includes("schedule") || q.includes("attendance") || q.includes("shift") || q.includes("bukas") || q.includes("hours")) {
      return {
        text: `🕒 **Oras ng Pagbubukas at Serbisyo ng Barangay Health Center:**\n\n` +
          `• **Lunes hanggang Biyernes:** 8:00 AM – 5:00 PM\n` +
          `• **Sabado at Linggo:** On-call para sa emergency at maternal concerns\n` +
          `• **Opisyal na Attendance:** Naka-integrate sa sistema gamit ang Clock In / Clock Out shift tracker upang maitala ang opisyal na Time-In ng mga BHW.\n\n` +
          `Para sa routine immunization ng sanggol at prenatal check-up, inirerekomendang pumunta tuwing umaga (8:30 AM - 11:30 AM).`,
        quickActions: [
          { label: "👩‍⚕️ Kontakin si Midwife", query: "Contact ni Mary Jane Landicho" },
          { label: "📍 Lokasyon ng Health Center", query: "Saan ang Health Center?" }
        ]
      };
    }

    // 8. GENERAL GREETINGS & FALLBACK HELP
    if (q === "hi" || q === "hello" || q === "kamusta" || q === "magandang araw" || q === "salamat" || q === "thanks") {
      return {
        text: `Magandang araw po! Ako si **Ate BHW**. Masaya akong makatulong sa iyo! 😊\n\nAno po ang nais ninyong malaman tungkol sa mga talaan ng kalusugan, mga residente, o mga sitio sa Barangay Subukin?`,
        quickActions: [
          { label: "📊 Ilan ang Records?", query: "Ilan ang kabuuang records sa sistema?" },
          { label: "📍 Saan ang mga Sitio?", query: "Saan matatagpuan ang mga Sitio?" },
          { label: "👩‍⚕️ Sino ang mga BHW?", query: "Sino ang mga BHW at kanilang kontak?" }
        ]
      };
    }

    // 9. INTELLIGENT RESIDENT NAME FALLBACK (Check if user directly typed a person's name)
    const words = q.split(" ").filter(w => w.length > 2);
    if (words.length >= 2) {
      try {
        const { data: matched } = await supabase
          .from("residents")
          .select("*")
          .ilike("full_name", `%${words[0]}%`)
          .limit(1);

        if (matched && matched.length > 0) {
          const r = matched[0];
          return {
            text: `Natagpuan ko ang talaan para kay **${r.full_name}**:\n\n` +
              `• **Edad:** ${r.age || "—"} • **Kasarian:** ${r.sex || "—"}\n` +
              `• **Sitio:** 📍 **${r.sitio || "Subukin"}**\n` +
              `• **Kapanganakan:** ${r.birthdate ? new Date(r.birthdate).toLocaleDateString() : "—"}\n` +
              `• **PhilHealth:** ${r.philhealth_number || "N/A"}\n\n` +
              `Nais mo bang makita ang kanyang kumpletong klinikal na buod (konsultasyon, bakuna, atbp.)?`,
            quickActions: [
              { label: `📋 Buong Buod ni ${r.full_name.split(" ")[0]}`, query: `Buod ng rekord ni ${r.full_name}` }
            ]
          };
        }
      } catch {}
    }

    // Default intelligent guidance
    return {
      text: `Naiintindihan ko! Bilang iyong **Ate BHW**, nakakonekta ako nang direkta sa database ng Barangay Subukin.\n\nMaaari mo akong tanungin tungkol sa:\n\n` +
        `1. **Kabuuang Estadistika** — *"Ilan ang kabuuang rekord sa sistema?"*\n` +
        `2. **Pasyente o Residente** — *"Ibigay ang buod ng rekord ni [Pangalan]"*\n` +
        `3. **Lokasyon ng Sitio** — *"Saan matatagpuan ang Sitio [Pangalan]?"*\n` +
        `4. **BHW at Contacts** — *"Sino ang BHW sa Sitio Maligaya at ano ang kontak?"*\n` +
        `5. **Emergency Hotlines** — *"Ano ang mga numero ng ambulansya at ospital?"*`,
      quickActions: [
        { label: "📊 Kabuuang Records", query: "Ilan ang kabuuang records sa sistema?" },
        { label: "📍 Listahan ng Sitios", query: "Saan matatagpuan ang mga Sitio?" },
        { label: "👩‍⚕️ BHW Contacts", query: "Sino ang mga BHW at ano ang kontak?" }
      ]
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isThinking) return;

    setInputText("");
    setShowFaqDrawer(false);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const response = await generateBotAnswer(query);
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: response.text,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: response.quickActions
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "bot",
        text: "Paumanhin, nagkaroon ng munting aberya sa pagsagot. Pakisubukang muli.",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "cleared-welcome",
        sender: "bot",
        text: language === "tl"
          ? "Bagong sesyon! Ako si **Ate BHW**. Paano ako makakatulong sa iyong mga katanungan sa kalusugan at datos ng barangay ngayon?"
          : "Fresh session! I am **Ate BHW**. How can I assist you with health records, sitios, or BHW contacts today?",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: [
          { label: "📊 Total Records", query: "Ilan ang kabuuang records sa sistema?" },
          { label: "📍 Listahan ng Sitios", query: "Saan ang mga Sitio?" },
          { label: "👩‍⚕️ BHW Directory", query: "Contact ng mga BHW" }
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
          {/* Friendly prompt bubble (only visible when unread or hovered) */}
          <div className="hidden sm:flex items-center gap-2 bg-card/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-primary/20 text-xs font-semibold text-foreground animate-bounce-subtle pointer-events-none">
            <Sparkles className="h-4 w-4 text-amber-500 animate-spin-slow shrink-0" />
            <span>
              {language === "tl" ? "May tanong sa talaan o sitio? Tanungin si Ate BHW!" : "Questions on records or sitios? Ask Ate BHW!"}
            </span>
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              setUnreadCount(0);
            }}
            className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary/95 to-sky-600 text-primary-foreground shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30 border-2 border-white/50 dark:border-primary/40 cursor-pointer"
            aria-label="Open Ate BHW Chatbot"
          >
            <AteBhwIcon size={34} className="text-white drop-shadow-sm" />
            
            {/* Active Green Dot */}
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />

            {/* Sparkle badge */}
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-md animate-pulse">
              <Sparkles className="h-3 w-3" />
            </span>
          </button>
        </div>
      )}

      {/* Main Chatbot Floating Window */}
      {isOpen && (
        <div 
          className={`fixed right-4 sm:right-6 z-50 transition-all duration-300 flex flex-col rounded-2xl shadow-2xl border border-border/60 bg-background/95 backdrop-blur-xl overflow-hidden ${
            isMinimized 
              ? "bottom-6 w-80 h-16" 
              : "bottom-4 sm:bottom-6 w-[calc(100vw-2rem)] sm:w-[440px] h-[600px] max-h-[88vh]"
          }`}
        >
          {/* Chat Window Header */}
          <div className="p-3.5 bg-gradient-to-r from-primary/15 via-primary/10 to-sky-500/15 border-b border-border/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-10 w-10 rounded-full bg-background border border-primary/30 p-0.5 shadow-sm shrink-0 flex items-center justify-center">
                <AteBhwIcon size={30} />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-heading font-bold text-sm text-foreground truncate">
                    Ate BHW
                  </h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/20 font-bold">
                    Health AI
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {language === "tl" ? "Barangay Subukin Assistant" : "Subukin Health Assistant"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              {/* Reset session */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:text-foreground hover:bg-muted/60"
                onClick={handleClearChat}
                title={language === "tl" ? "Simulan muli ang chat" : "Reset conversation"}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              {/* Minimize / Expand */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:text-foreground hover:bg-muted/60"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Clickable Quick FAQ Pills Carousel */}
              <div className="bg-muted/30 border-b border-border/30 px-3 py-2 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3 text-primary" />
                    {language === "tl" ? "Mga Madalas Itanong (FAQ):" : "Frequently Asked Questions:"}
                  </span>
                  <button 
                    onClick={() => setShowFaqDrawer(!showFaqDrawer)}
                    className="text-primary hover:underline text-[10px] font-bold"
                  >
                    {showFaqDrawer ? (language === "tl" ? "Itago" : "Hide") : (language === "tl" ? "Lahat ng FAQ" : "View All")}
                  </button>
                </div>

                {/* Horizontal Quick Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {FAQ_QUESTIONS.slice(0, 5).map(faq => (
                    <button
                      key={faq.id}
                      onClick={() => handleSendMessage(faq.query)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-card hover:bg-primary/10 hover:text-primary border border-border/50 text-foreground transition-all shrink-0 shadow-2xs active:scale-95 flex items-center gap-1"
                    >
                      <span>{faq.label}</span>
                    </button>
                  ))}
                </div>

                {/* Expandable Full FAQ List */}
                {showFaqDrawer && (
                  <div className="mt-2 pt-2 border-t border-border/30 max-h-48 overflow-y-auto space-y-1.5 animate-fade-in pr-1">
                    {FAQ_QUESTIONS.map(faq => (
                      <button
                        key={faq.id}
                        onClick={() => handleSendMessage(faq.query)}
                        className="w-full text-left p-2 rounded-lg bg-card/80 hover:bg-primary/10 border border-border/40 text-xs font-medium text-foreground transition-all flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{faq.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message History Stream */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 text-xs">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-start gap-2 max-w-[90%]">
                      {msg.sender === "bot" && (
                        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 shrink-0 mt-0.5 flex items-center justify-center">
                          <AteBhwIcon size={18} />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl p-3 shadow-2xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                            : "bg-muted/50 border border-border/40 text-foreground rounded-tl-xs whitespace-pre-wrap"
                        }`}
                      >
                        {/* Parse bold and bullets for nice rendering */}
                        {msg.text.split("\n").map((line, idx) => {
                          // Header-style lines
                          if (line.startsWith("• ") || line.startsWith("- ")) {
                            return (
                              <p key={idx} className="my-0.5 pl-2 border-l-2 border-primary/40">
                                {line}
                              </p>
                            );
                          }
                          return (
                            <p key={idx} className={line.trim() === "" ? "h-2" : "my-0.5"}>
                              {line}
                            </p>
                          );
                        })}

                        {/* Quick action follow-up buttons */}
                        {msg.quickActions && msg.quickActions.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-border/30 flex flex-wrap gap-1.5">
                            {msg.quickActions.map((qa, i) => (
                              <button
                                key={i}
                                onClick={() => handleSendMessage(qa.query)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background hover:bg-primary hover:text-white border border-border/40 text-foreground transition-all shadow-2xs active:scale-95"
                              >
                                {qa.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {/* Thinking / Typing Indicator */}
                {isThinking && (
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 shrink-0 mt-0.5 flex items-center justify-center">
                      <AteBhwIcon size={18} />
                    </div>
                    <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                      <span className="text-[11px] ml-1 font-medium italic">
                        {language === "tl" ? "Sinisuri ang database..." : "Searching database..."}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Toolbar */}
              <div className="p-3 bg-muted/20 border-t border-border/40 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      language === "tl"
                        ? "Magtanong kay Ate BHW (e.g. buod ng residente, sitio, kontak)..."
                        : "Ask Ate BHW (e.g. resident summary, sitio coordinates, contacts)..."
                    }
                    className="h-10 text-xs bg-background/80 border-border/60 focus-visible:ring-primary/40 rounded-xl"
                    disabled={isThinking}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputText.trim() || isThinking}
                    className="h-10 w-10 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 mt-1.5">
                  <span className="truncate">
                    💡 {language === "tl" ? "Maaaring mag-type ng pangalan ng residente para sa buod" : "Type resident name for instant clinical summary"}
                  </span>
                  <span className="font-semibold text-primary/80 shrink-0">
                    Barangay Subukin
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
export default AteBhwChatbot;
