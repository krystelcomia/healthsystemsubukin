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

// Custom Icon for BHAI - Barangay Health AI Avatar
export const BhaiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => {
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

// Backwards-compatible export
export const AteBhwIcon = BhaiIcon;

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
    location: "Kanlurang baybayin ng Barangay Subukin na katabi ng mga lupang sakahan.",
    landmarks: "Malapit sa daungan ng bangka ng mga mangingisda at daanang papasok ng Sitio Cama.",
    assignedBhw: "Mercy O. Abanilla",
    contact: "0949-7768-394"
  },
  "Sitio Makalintal 1": {
    coords: "13.7215° N, 121.4385° E",
    location: "Gitna at timog na bahagi ng barangay sa kahabaan ng pangunahing kalsada ng Makalintal.",
    landmarks: "Kapilya ng Makalintal 1 at pangunahing daanan ng barangay.",
    assignedBhw: "Suzette B. Lopez",
    contact: "0935-2008-942"
  },
  "Sitio Makalintal 2": {
    coords: "13.7225° N, 121.4395° E",
    location: "Silangang kadugtong ng Makalintal papunta sa tabing-dagat.",
    landmarks: "Malapit sa karatula ng hangganan ng Makalintal at kumpol ng mga kabahayan.",
    assignedBhw: "Renchie V. Ilao",
    contact: "0965-6627-031"
  },
  "Sitio Maligaya": {
    coords: "13.7240° N, 121.4375° E",
    location: "Hilaga at gitnang bahagi ng Subukin, komunidad ng mga magsasaka at pamilya.",
    landmarks: "Basketball Court ng Maligaya at bulwagan ng sitio.",
    assignedBhw: "Cecilia G. Benosa",
    contact: "0921-8509-320"
  },
  "Sitio Manggahan 1": {
    coords: "13.7255° N, 121.4355° E",
    location: "Hilagang-kanlurang bahagi na kilala sa mga taniman ng mangga at halamanan.",
    landmarks: "Lumang taniman ng mangga at hilagang farm-to-market road.",
    assignedBhw: "Evelyn T. Ilao",
    contact: "0935-5638-247"
  },
  "Sitio Manggahan 2": {
    coords: "13.7265° N, 121.4345° E",
    location: "Duluhan sa hilagang-kanlurang hangganan ng Barangay Subukin papuntang kaburulan.",
    landmarks: "Mataas na daanan ng Manggahan at gilid ng burol.",
    assignedBhw: "Nenita M. Dimaculangan",
    contact: "0985-1225-857"
  },
  "Sitio Masaya": {
    coords: "13.7235° N, 121.4330° E",
    location: "Kanlurang komunidad ng kabahayan na katabi ng mga taniman at sakahan.",
    landmarks: "Bantayan ng Sitio Masaya at kanal ng irigasyon sa kanluran.",
    assignedBhw: "Wilma D. Tanyag",
    contact: "0997-4971-138"
  },
  "Sitio Masigla": {
    coords: "13.7220° N, 121.4350° E",
    location: "Timog at gitnang bahagi malapit sa pangunahing arko o papasok sa Barangay Subukin.",
    landmarks: "Barangay Welcome Arch at sentro ng pamayanan ng Masigla.",
    assignedBhw: "Cristeta R. Lanuza (Supervisory) & Maribel M. Abayon (BNS)",
    contact: "0919-6980-712"
  },
  "Sitio Matahimik / Burol": {
    coords: "13.7250° N, 121.4410° E",
    location: "Mataas na bahagi o burol kung saan matatanaw ang silangang look ng dagat.",
    landmarks: "Tuktok ng burol na may tanawin at hilagang-silangang landas.",
    assignedBhw: "Renalyn D. Laurante",
    contact: "0985-1086-472"
  },
  "Sitio Matahimik / Punta": {
    coords: "13.7245° N, 121.4425° E",
    location: "Pinakasilangang baybayin (Punta) na direktang nakaharap sa Tayabas Bay.",
    landmarks: "Baybayin ng Punta, himpilan ng mangingisda, at dike ng dalampasigan.",
    assignedBhw: "Merlita R. Alonzo",
    contact: "0930-9085-713"
  },
  "Sitio Puntor": {
    coords: "13.7210° N, 121.4415° E",
    location: "Timog-silangang baybayin na may mga bakawan sa gilid ng Tayabas Bay.",
    landmarks: "Daanan sa tabing-dagat ng Puntor, daungan ng bangka, at dalampasigan.",
    assignedBhw: "Amelita R. Sayat",
    contact: "0931-0232-973"
  },
  "Subukin Main / Health Center": {
    coords: "13.72335° N, 121.44059° E",
    location: "Opisyal na Barangay Hall at Pangunahing Health Center compound, San Juan, Batangas.",
    landmarks: "Barangay Subukin Hall, Health Center, Daycare Center, at Plaza.",
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
  { id: "totals", label: "📊 Kabuuang Bilang ng Records", query: "Ilan po ang kabuuang bilang ng records sa ating sistema?" },
  { id: "sitios", label: "📍 Lokasyon ng mga Sitio", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin at ano ang coordinates?" },
  { id: "bhw", label: "👩‍⚕️ Direktoryo ng mga BHW", query: "Sino-sino po ang mga BHW at ano ang kanilang contact number at itinalagang sitio?" },
  { id: "resident_summary", label: "👤 Buod ng Rekord ng Residente", query: "Paano po makikita ang buod o rekord ng isang residente?" },
  { id: "seniors", label: "👴 Serbisyong Pangkalusugan ng Senior", query: "Ano-ano po ang mga serbisyong pangkalusugan para sa mga nakatatanda o senior citizen?" },
  { id: "emergency", label: "🚨 Emergency Hotlines sa San Juan", query: "Ano-ano po ang mga emergency hotline at contact numbers sa San Juan, Batangas?" },
  { id: "clinic_hours", label: "🕒 Oras ng Health Center", query: "Ano po ang opisyal na oras ng pagbubukas ng Health Center?" },
  { id: "dengue", label: "🦟 Pag-iingat Laban sa Dengue", query: "Ilan po ang naitalang inspeksyon sa dengue at paano makakaiwas?" }
];

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  quickActions?: { label: string; query: string }[];
}

export function BhaiChatbot() {
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
        text: "Magandang araw po sa inyo! Ako po si BHAI (Barangay Health AI), ang inyong magalang na katulong sa kalusugan at datos ng Barangay Subukin. 😊\n\nNandito po ako upang tulungan ang ating mga kawani at residente. Maaari po ninyong itanong sa akin ang:\n\n• 📊 Kabuuang bilang ng mga talaan (residente, konsultasyon, bakuna, buntis, atbp.)\n• 🤰 Maternal Care at Prenatal (mga buntis at panganganak)\n• 👶 Bakuna at Kalusugan ng Bata (mga sanggol at bata)\n• 👨‍👩‍👧 Family Planning at mga paraan ng proteksyon\n• 🩺 Konsultasyon at mga karaniwang sakit sa Barangay\n• 👴 Serbisyong Pangkalusugan ng Senior Citizen at BP Check\n• 📍 Lokasyon, populasyon, at coordinates ng bawat Sitio\n• 👩‍⚕️ Sino ang naka-duty ngayon at kontak ng mga BHW\n• 📝 Activity Logs at talaan ng mga nagbura o nag-print sa sistema\n• 💡 Gabay sa paggamit ng sistema (paano magdagdag ng residente, mag-print, atbp.)\n• 🚨 Emergency hotlines at ambulansya sa San Juan, Batangas\n\nMaaari rin po ninyong itanong ang anumang pangalan, pamilya, o katanungang pangkalusugan!",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: [
          { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
          { label: "👩‍⚕️ Sino ang Naka-Duty?", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" },
          { label: "🤰 Talaan ng mga Buntis", query: "Ilan po ang mga buntis sa ating talaan?" },
          { label: "👶 Bakuna sa mga Bata", query: "Ilan po ang mga batang may tala ng bakuna?" },
          { label: "📍 Listahan ng Sitio", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" }
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

  // Clean all asterisks helper to keep responses completely clean
  const cleanFormat = (text: string): string => {
    return text.replace(/\*\*/g, "").replace(/\*/g, "");
  };

  // Comprehensive Data Answering Engine sa Magalang na Tagalog para sa mga Nakatatanda at Kawani
  const generateBotAnswer = async (userQuery: string): Promise<{ text: string; quickActions?: { label: string; query: string }[] }> => {
    const q = userQuery.toLowerCase().trim();

    // 1. KABUUANG BILANG NG TALAAN / SYSTEM STATISTICS
    if (
      q.includes("total") || 
      q.includes("bilang") || 
      q.includes("statistics") || 
      q.includes("stats") || 
      q.includes("ilan") || 
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

        const responseText = 
          `Opo, narito po ang kasalukuyang Opisyal na Talaan at Estadistika sa sistema ng kalusugan ng Barangay Subukin:\n\n` +
          `📁 KABUUANG TALA SA DATABASE: ${grandTotal.toLocaleString()} mga rekord\n\n` +
          `• 👥 Mga Rehistradong Residente: ${rTotal.toLocaleString()} katao\n` +
          `• 🏠 Mga Pamilya at Kabahayan (Census): ${fTotal.toLocaleString()} pamilya\n` +
          `• 🩺 Konsultasyon at Check-up: ${cTotal.toLocaleString()} rekord\n` +
          `• 🤰 Maternal Care (Para sa mga Buntis): ${mTotal.toLocaleString()} rekord\n` +
          `• 👶 Kalusugan ng Bata at Bakuna: ${chTotal.toLocaleString()} rekord\n` +
          `• 👨‍👩‍👧 Family Planning Records: ${fpTotal.toLocaleString()} rekord\n` +
          `• 🦟 Dengue Prevention Inspections: ${dTotal.toLocaleString()} bahay\n` +
          `• ❤️ PhilPen NCD Screening (Presyon at Sugar): ${pTotal.toLocaleString()} rekord\n` +
          `• 👩‍⚕️ Mga Kawani / BHW Workers: ${wTotal} tauhan\n` +
          `• 📝 Naitalang Activity Logs ng Sistema: ${rawActivityLogs.length}\n` +
          `• 🕒 Attendance Check-ins ng mga BHW: ${rawAttendance.length}\n\n` +
          `Lahat po ng datos na ito ay ligtas na nakatala at regular na ina-update ng ating mga masisipag na Barangay Health Workers.`;

        return {
          text: cleanFormat(responseText),
          quickActions: [
            { label: "🤰 Mga Buntis", query: "Ilan po ang mga buntis sa ating talaan?" },
            { label: "👶 Mga Bakuna", query: "Ilan po ang mga batang may tala ng bakuna?" },
            { label: "📍 Listahan ng Sitios", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
            { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at kanilang kontak?" }
          ]
        };
      } catch (err) {
        return {
          text: "Paumanhin po, nagkaroon po ng sandaling aberya sa pagkuha ng tala sa database. Pakisubukang muli po sa ilang sandali."
        };
      }
    }

    // 2. MATERNAL CARE / BUNTIS / PRENATAL CHECKUP
    if (
      q.includes("buntis") || 
      q.includes("maternal") || 
      q.includes("prenatal") || 
      q.includes("panganganak") || 
      q.includes("manganganak") || 
      q.includes("trimester") ||
      q.includes("buntis sa")
    ) {
      try {
        const { data: maternalList } = await supabase
          .from("maternal_care" as any)
          .select("*")
          .limit(10);

        const mRecords = (maternalList as any[]) || [];
        const count = mRecords.length;

        let matResponse = `🤰 TALAAN NG MGA BUNTIS AT MATERNAL CARE (Barangay Subukin):\n\n`;
        matResponse += `Mayroon po tayong ${count} naitalang mga rekord ng pagbubuntis at prenatal care sa sistema.\n\n`;

        if (count > 0) {
          matResponse += `Mga kamakailang talaan:\n`;
          mRecords.slice(0, 5).forEach((m: any, idx: number) => {
            const pName = m.patient_name || m.name || m.resident_name || "Pasyente";
            const sitio = m.sitio || m.address || "Subukin";
            const edd = m.edd || m.expected_delivery_date || m.due_date;
            const eddStr = edd ? new Date(edd).toLocaleDateString() : "Walang petsa ng EDD";
            const risk = m.risk_level || m.risk || "Normal";
            matResponse += `${idx + 1}. ${pName} — Sitio: ${sitio} • Inaasahang Panganganak: ${eddStr} (Risk: ${risk})\n`;
          });
          matResponse += `\nPaalala sa mga BHW: Tiyakin po na regular silang nakakapag-prenatal checkup sa Barangay Health Center tuwing umaga kasama si Midwife Mary Jane Landicho.`;
        } else {
          matResponse += `Wala pa pong aktibong talaan ng buntis sa kasalukuyan o kailangan pang i-update sa Maternal Care form.`;
        }

        return {
          text: cleanFormat(matResponse),
          quickActions: [
            { label: "👶 Kalusugan ng Bata", query: "Ilan po ang mga batang may tala ng bakuna?" },
            { label: "👩‍⚕️ Tawagan si Midwife", query: "Contact ni Mary Jane Landicho" }
          ]
        };
      } catch {
        return {
          text: "Nasa talaan po ng Maternal Care ang mga rekord ng mga nagdadalang-tao. Maaari pong tingnan sa Maternal Care Form o magtanong kay Midwife Mary Jane Landicho."
        };
      }
    }

    // 3. CHILD HEALTH & BAKUNA / IMMUNIZATION
    if (
      q.includes("bakuna") || 
      q.includes("bata") || 
      q.includes("sanggol") || 
      q.includes("child") || 
      q.includes("immunization") || 
      q.includes("timbang") || 
      q.includes("bcg") || 
      q.includes("polio") || 
      q.includes("measles")
    ) {
      try {
        const { data: childList } = await supabase
          .from("child_health" as any)
          .select("*")
          .limit(10);

        const cRecords = (childList as any[]) || [];
        const count = cRecords.length;

        let childResponse = `👶 KALUSUGAN NG BATA AT BAKUNA (Child Health & Immunization):\n\n`;
        childResponse += `Mayroong ${count} naitalang bata at sanggol sa ating sistema para sa pagbabakuna at pagsubaybay sa timbang.\n\n`;

        if (count > 0) {
          childResponse += `Mga naitalang talaan ng bata:\n`;
          cRecords.slice(0, 5).forEach((c: any, idx: number) => {
            const cName = c.child_name || c.name || "Bata";
            const mother = c.mother_name || c.parent_name || "Magulang";
            const sitio = c.sitio || c.address || "Subukin";
            const status = c.immunization_status || c.vaccine_status || "Kasama sa programa";
            childResponse += `${idx + 1}. ${cName} — Magulang: ${mother} • Sitio: ${sitio} (${status})\n`;
          });
          childResponse += `\nMahahalagang Bakuna ng Sanggol sa Health Center:\n`;
          childResponse += `• BCG (Proteksyon laban sa TB)\n`;
          childResponse += `• Hepatitis B (Unang 24 oras matapos ipanganak)\n`;
          childResponse += `• Pentavalent (DPT-HepB-HiB)\n`;
          childResponse += `• OPV / IPV (Laban sa Polio)\n`;
          childResponse += `• PCV (Laban sa Pulmonya)\n`;
          childResponse += `• MMR / Measles (Laban sa Tigdas)\n\n`;
          childResponse += `Maaari pong dalhin ang sanggol sa Health Center para sa regular na bakuna tuwing itinakdang immunization day.`;
        } else {
          childResponse += `Ligtas pong nakatala ang mga sanggol sa ating Child Health Form para sa regular na bakuna at deworming.`;
        }

        return {
          text: cleanFormat(childResponse),
          quickActions: [
            { label: "🤰 Maternal Care", query: "Ilan po ang mga buntis sa ating talaan?" },
            { label: "👩‍⚕️ Kontak ng Midwife", query: "Contact ni Mary Jane Landicho" }
          ]
        };
      } catch {
        return {
          text: "Ang programa sa pagbabakuna ng mga sanggol ay regular na isinasagawa sa Barangay Subukin Health Center. Pakisangguni po kay Midwife Mary Jane Landicho."
        };
      }
    }

    // 4. FAMILY PLANNING / PAGPAPLANO NG PAMILYA
    if (
      q.includes("family planning") || 
      q.includes("fp") || 
      q.includes("pills") || 
      q.includes("dmpa") || 
      q.includes("condom") || 
      q.includes("iud") || 
      q.includes("implant") ||
      q.includes("contraceptive")
    ) {
      try {
        const { count } = await supabase.from("family_planning").select("*", { count: "exact", head: true });
        return {
          text: cleanFormat(
            `👨‍👩‍👧 PROGRAMA SA FAMILY PLANNING (Barangay Subukin):\n\n` +
            `Mayroong ${(count || 0).toLocaleString()} naitalang mga kliyente sa ating Family Planning registry.\n\n` +
            `Mga Libreng Serbisyo at Paraan na Makukuha sa Health Center:\n` +
            `• Oral Contraceptive Pills (COC / POP para sa nagpapasuso)\n` +
            `• DMPA Injectables (Depo shot tuwing 3 buwan)\n` +
            `• Condoms (Laban sa impeksyon at pagbubuntis)\n` +
            `• Referral para sa IUD at Subdermal Implant sa San Juan RHU\n` +
            `• Natural Family Planning Counseling (BOM, SDM, LAM)\n\n` +
            `Maaari pong sumangguni sa ating BHW o kay Midwife Mary Jane para sa ligtas at kompidensyal na pagpapayo.`
          ),
          quickActions: [
            { label: "👩‍⚕️ Kontak ng BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
            { label: "🕒 Oras ng Center", query: "Ano po ang oras ng Health Center?" }
          ]
        };
      } catch {
        return {
          text: "Ang Family Planning services ay libreng ipinagkakaloob sa Barangay Health Center sa pamamahala ng ating Midwife."
        };
      }
    }

    // 5. KONSULTASYON, CHECK-UP, AT MGA SAKIT (CONSULTATIONS & MORBIDITY)
    if (
      q.includes("konsultasyon") || 
      q.includes("consultation") || 
      q.includes("checkup") || 
      q.includes("check-up") || 
      q.includes("sakit") || 
      q.includes("reklamo") || 
      q.includes("ubo") || 
      q.includes("lagnat") || 
      q.includes("sipon")
    ) {
      try {
        const { data: consData, count } = await supabase
          .from("consultations")
          .select("*", { count: "exact" })
          .order("consultation_date", { ascending: false })
          .limit(5);

        let cText = `🩺 TALAAN NG KONSULTASYON AT CHECK-UP SA HEALTH CENTER:\n\n`;
        cText += `Kabuuang naitalang konsultasyon sa sistema: ${(count || 0).toLocaleString()} mga rekord.\n\n`;

        if (consData && consData.length > 0) {
          cText += `Kamakailang mga pasyenteng nagpa-checkup:\n`;
          consData.forEach((c: any, i: number) => {
            const dateStr = c.consultation_date ? new Date(c.consultation_date).toLocaleDateString() : "Petsa";
            const cause = c.consultation_cause || c.diagnosis || "General Consultation";
            const rName = c.resident_name || c.patient_name || "Residente";
            cText += `${i + 1}. ${dateStr}: ${rName} — Reklamo/Sakit: ${cause}\n`;
          });
          cText += `\nKaraniwang Karamdaman sa Barangay:\n`;
          cText += `• Upper Respiratory Tract Infection (Ubo at Sipon)\n`;
          cText += `• Acute Gastroenteritis o pananakit ng tiyan\n`;
          cText += `• Altapresyon / Hypertension check\n`;
          cText += `• Lagnat at pananakit ng katawan\n\n`;
          cText += `Paalala: Kapag ang lagnat ay lumampas sa 2 araw, ipatingin agad sa Health Center upang maeksamen laban sa dengue o impeksyon.`;
        }

        return {
          text: cleanFormat(cText),
          quickActions: [
            { label: "📊 Lahat ng Records", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
            { label: "🕒 Oras ng Center", query: "Ano po ang oras ng Health Center?" }
          ]
        };
      } catch {
        return {
          text: "Naitatala po ang bawat konsultasyon sa Consultation Form kasama ang vitals, diagnosis, at ibinigay na gamot."
        };
      }
    }

    // 6. MGA SERBISYO PARA SA MGA SENIOR CITIZEN AT NAKATATANDA
    if (
      q.includes("senior") || 
      q.includes("matanda") || 
      q.includes("nakatatanda") || 
      q.includes("altapresyon") || 
      q.includes("high blood") || 
      q.includes("presyon") || 
      q.includes("maintenance") || 
      q.includes("diabetes") || 
      q.includes("sugar")
    ) {
      try {
        const { count: seniorCount } = await supabase
          .from("residents")
          .select("*", { count: "exact", head: true })
          .gte("age", 60);

        const { count: philCount } = await supabase
          .from("philpen_health")
          .select("*", { count: "exact", head: true });

        const seniorTotal = seniorCount || 0;
        const philTotal = philCount || 0;

        return {
          text: cleanFormat(
            `👴👵 MGA SERBISYONG PANGKALUSUGAN PARA SA MGA SENIOR CITIZEN (Barangay Subukin):\n\n` +
            `Mayroong ${seniorTotal.toLocaleString()} rehistradong senior citizen sa ating barangay, at ${philTotal.toLocaleString()} ang sumailalim sa PhilPen Risk Assessment.\n\n` +
            `Mga Tulong at Serbisyo:\n` +
            `1. Libreng Pagkuha ng Blood Pressure (BP):\n` +
            `   • Maaari pong magpakuha ng BP sa Health Center o sa BHW na nakatalaga sa inyong Sitio anumang araw.\n\n` +
            `2. PhilPen NCD Screening:\n` +
            `   • Pagsusuri para sa diabetes, sakit sa puso, at stroke risk upang maagapan ang anumang komplikasyon.\n\n` +
            `3. Tulong sa Maintenance Medicines:\n` +
            `   • Pamamahagi ng mga gamot sa altapresyon at diabetes kapag may alokasyon mula sa San Juan RHU.\n\n` +
            `4. Home Visit ng BHW:\n` +
            `   • Para sa mga bedridden o nahihirapang lumakad, binibisita po sila sa tahanan ng kanilang BHW para sa BP monitoring.\n\n` +
            `May partikular po ba kayong nararamdaman o nais na ikonsulta sa ating Midwife o BHW?`
          ),
          quickActions: [
            { label: "👩‍⚕️ Tawagan ang BHW", query: "Sino-sino po ang mga BHW at ano ang telepono?" },
            { label: "🕒 Oras ng Health Center", query: "Ano po ang oras ng Health Center?" },
            { label: "🚨 Emergency Hotlines", query: "Ano-ano po ang emergency hotlines sa San Juan?" }
          ]
        };
      } catch {
        return {
          text: cleanFormat(
            `Lubos pong pinahahalagahan ng ating barangay ang kalusugan ng ating mga senior citizen. May libreng BP checkup, maintenance medicines alinsunod sa alokasyon ng RHU, at regular na home visits mula sa BHW.`
          )
        };
      }
    }

    // 7. SINO ANG NAKA-DUTY / ATTENDANCE INQUIRY
    if (
      q.includes("duty") || 
      q.includes("shift") || 
      q.includes("attendance") || 
      q.includes("pumasok") || 
      q.includes("time in") || 
      q.includes("time out") || 
      q.includes("naka-duty") ||
      q.includes("naka duty")
    ) {
      try {
        const rawAttendance = JSON.parse(localStorage.getItem("bhw_attendance_logs") || "[]");
        const activeShifts = rawAttendance.filter((log: any) => !log.logoutAt);
        const todayStr = new Date().toISOString().split("T")[0];
        const todaysLogs = rawAttendance.filter((log: any) => {
          const lDate = log.loginAt ? new Date(log.loginAt).toISOString().split("T")[0] : "";
          return lDate === todayStr;
        });

        let dutyText = `🕒 ATTENDANCE AT KASALUKUYANG SHIFT NG MGA BHW:\n\n`;

        if (activeShifts.length > 0) {
          dutyText += `Mga KASALUKUYANG NAKA-DUTY (Aktibong Shift ngayon):\n`;
          activeShifts.forEach((s: any, idx: number) => {
            const timeIn = s.loginAt ? new Date(s.loginAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";
            dutyText += `${idx + 1}. 🟢 ${s.workerName || "BHW Staff"} — Pumasok noong ${timeIn} (${s.sitio || "Health Center"})\n`;
          });
          dutyText += `\nKabuuang pumasok ngayong araw: ${todaysLogs.length} kawani.\n`;
        } else {
          dutyText += `Wala pong aktibong shift na kasalukuyang naka-clock in ngayon.\n`;
          if (todaysLogs.length > 0) {
            dutyText += `Ngunit mayroong ${todaysLogs.length} kawani na nakapag-duty at naka-check out na ngayong araw.\n`;
          } else {
            dutyText += `Ang attendance ay naitatala sa pamamagitan ng Attendance tracker button sa itaas ng screen.\n`;
          }
        }

        dutyText += `\nPara makipag-ugnayan sa on-call staff, maaari pong tawagan si Midwife Mary Jane Landicho sa 0912-345-6789 o si Supervisor Cristeta Lanuza sa 0919-6980-712.`;

        return {
          text: cleanFormat(dutyText),
          quickActions: [
            { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at kanilang kontak?" },
            { label: "🕒 Oras ng Center", query: "Ano po ang oras ng Health Center?" }
          ]
        };
      } catch {
        return {
          text: "Naitatala po ang oras ng pagpasok at paglabas ng mga BHW sa System Attendance Logs sa itaas ng navigation bar."
        };
      }
    }

    // 8. ACTIVITY LOGS / AUDIT INQUIRIES (Sino ang nagbura, nag-print, nag-record)
    if (
      q.includes("activity log") || 
      q.includes("audit") || 
      q.includes("nagbura") || 
      q.includes("nag-delete") || 
      q.includes("nag-print") || 
      q.includes("nag-record") || 
      q.includes("nag-edit") || 
      q.includes("huling ginawa") || 
      q.includes("history")
    ) {
      try {
        const rawActivityLogs = JSON.parse(localStorage.getItem("bhw_activity_logs") || "[]");
        const count = rawActivityLogs.length;

        let actText = `📝 TALAAN NG MGA GAWAIN SA SISTEMA (Activity Logs):\n\n`;
        actText += `Mayroong kabuuang ${count.toLocaleString()} naitalang pagkilos o aktibidad sa ating audit trail.\n\n`;

        if (count > 0) {
          actText += `Mga pinakabagong aktibidad:\n`;
          rawActivityLogs.slice(0, 5).forEach((act: any, idx: number) => {
            const time = act.timeStr || (act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : "");
            const date = act.dateKey || (act.timestamp ? new Date(act.timestamp).toLocaleDateString() : "");
            actText += `${idx + 1}. [${date} ${time}] ${act.workerName || "Staff"}: ${act.description || act.action}\n`;
          });
          actText += `\nLahat po ng pagdaragdag ng datos, pag-eedit, pagbura ng tala, at pag-print ay awtomatikong naitatala kasama ang pangalan ng kawani para sa seguridad ng datos.`;
        } else {
          actText += `Wala pa pong naitalang bagong aktibidad sa system log.`;
        }

        return {
          text: cleanFormat(actText),
          quickActions: [
            { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
            { label: "🕒 Attendance Logs", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" }
          ]
        };
      } catch {
        return {
          text: "Makikita po ang buong talaan ng gawain sa System Activity Logs sa ilalim ng Attendance menu."
        };
      }
    }

    // 9. BACKUP & RECOVERY / DATA SAFETY
    if (
      q.includes("backup") || 
      q.includes("restore") || 
      q.includes("recovery") || 
      q.includes("i-save ang system") || 
      q.includes("database safety")
    ) {
      try {
        const backupHistory = JSON.parse(localStorage.getItem("bhw_backup_history") || "[]");
        const autoConfig = JSON.parse(localStorage.getItem("bhw_auto_backup_config") || "{}");

        let bText = `💾 BACKUP AT SEGURIDAD NG DATOS SA BARANGAY SUBUKIN:\n\n`;
        bText += `Mayroong ${backupHistory.length} naitalang backup files sa kasaysayan ng sistema.\n`;
        bText += `Awtomatikong Backup Schedule: ${autoConfig.frequency ? autoConfig.frequency.toUpperCase() : "WEEKLY"}\n\n`;

        if (backupHistory.length > 0) {
          const lastB = backupHistory[0];
          bText += `Huling Nabuong Backup:\n`;
          bText += `• File: ${lastB.filename || "bhw-backup.json"}\n`;
          bText += `• Petsa: ${lastB.timestamp ? new Date(lastB.timestamp).toLocaleString() : "Kamakailan"}\n`;
          bText += `• Laki: ${lastB.size || "400+ KB"}\n\n`;
        }

        bText += `Paano Mag-Backup:\n`;
        bText += `1. Pumunta sa Admin menu sa kaliwa.\n`;
        bText += `2. Pindutin ang Backup & Recovery.\n`;
        bText += `3. Pindutin ang button na 'Create Backup Now' upang mai-download ang JSON backup file sa inyong computer.`;

        return {
          text: cleanFormat(bText),
          quickActions: [
            { label: "📊 Kabuuang Records", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
            { label: "📝 Activity Logs", query: "Ano ang huling activity logs?" }
          ]
        };
      } catch {
        return {
          text: "Ang backup ng database ay regular na ginagawa sa Admin -> Backup & Recovery upang mapangalagaan ang lahat ng talaan."
        };
      }
    }

    // 10. HOW-TO GUIDES / TULONG SA PAGGAMIT NG SISTEMA PARA SA MGA BHW
    if (
      q.includes("paano") || 
      q.includes("how to") || 
      q.includes("tulong sa paggamit") || 
      q.includes("paano mag") || 
      q.includes("saan makikita")
    ) {
      if (q.includes("residente") || q.includes("magdagdag") || q.includes("add resident")) {
        return {
          text: cleanFormat(
            `💡 GABAY: PAANO MAGDAGDAG NG RESIDENTE SA SISTEMA:\n\n` +
            `1. Pindutin ang 'Resident Records' sa kaliwang menu (sidebar).\n` +
            `2. I-click ang berdeng button na '+ Add Resident'.\n` +
            `3. Punan ang mga sumusunod na detalye:\n` +
            `   • Buong Pangalan (Apelyido, Pangalan, Gitnang Pangalan)\n` +
            `   • Kaarawan at Edad\n` +
            `   • Kasarian at Katayuang Sibil\n` +
            `   • Sitio sa Barangay Subukin\n` +
            `   • PhilHealth Number (kung mayroon) at Telepono\n` +
            `4. Pindutin ang 'Save Resident' sa ibaba.\n\n` +
            `Awtomatiko pong maitatala ang bagong residente sa database at magiging bahagi ng estadistika ng barangay.`
          ),
          quickActions: [
            { label: "📊 Kabuuang Residente", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
          ]
        };
      }

      if (q.includes("print") || q.includes("mag-print") || q.includes("report")) {
        return {
          text: cleanFormat(
            `💡 GABAY: PAANO MAG-PRINT NG OPISYAL NA REPORT:\n\n` +
            `1. Pumunta sa pahina ng nais i-print (halimbawa: Dashboard Overview, Resident Records, o Attendance Logs).\n` +
            `2. Hanapin ang button na may icon ng printer (Print Report / I-print).\n` +
            `3. Bubukas ang opisyal na printable format na may opisyal na letterhead at logo ng Barangay Subukin at Bayan ng San Juan.\n` +
            `4. Piliin ang inyong printer o i-save bilang PDF sa inyong computer.\n\n` +
            `Lahat po ng opisyal na ulat ay may nakalagay na petsa at espasyo para sa pirma ng Barangay Midwife o Supervisor.`
          ),
          quickActions: [
            { label: "🕒 Print Attendance", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" }
          ]
        };
      }

      if (q.includes("time in") || q.includes("clock in") || q.includes("attendance")) {
        return {
          text: cleanFormat(
            `💡 GABAY: PAANO MAG-TIME IN O MAG-CLOCK OUT:\n\n` +
            `1. Sa pinaka-itaas na bar ng sistema, hanapin ang attendance icon (may fingerprint / orasan).\n` +
            `2. Pindutin ang button upang mag-Clock In sa pagsisimula ng inyong shift.\n` +
            `3. Sa pagtatapos ng inyong shift o tungkulin, pindutin ang 'Clock Out'.\n` +
            `4. Awtomatiko nitong bibilangin ang tagal ng inyong shift at itatala sa opisyal na Attendance Logs.`
          ),
          quickActions: [
            { label: "🕒 Tingnan ang Attendance", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" }
          ]
        };
      }

      return {
        text: cleanFormat(
          `💡 GABAY SA SISTEMA NG BARANGAY SUBUKIN HEALTH CENTER:\n\n` +
          `Maaari po akong magbigay ng gabay sa alinman sa mga sumusunod:\n` +
          `• Paano magdagdag ng residente o pamilya\n` +
          `• Paano magtala ng konsultasyon, bakuna, o prenatal checkup\n` +
          `• Paano mag-print ng opisyal na report o health summary\n` +
          `• Paano mag-time in at time out sa attendance\n` +
          `• Paano mag-backup at mag-restore ng database\n\n` +
          `Pakitukoy po kung aling gawain ang kailangan ninyo ng tulong!`
        ),
        quickActions: [
          { label: "👤 Magdagdag ng Residente", query: "Paano magdagdag ng residente?" },
          { label: "🖨 Mag-print ng Report", query: "Paano mag-print ng report?" },
          { label: "🕒 Mag-time In", query: "Paano mag-time in?" }
        ]
      };
    }

    // 11. PARTIKULAR NA SITIO O LOKASYON (May live system population count)
    const matchedSitioKey = Object.keys(SITIO_DETAILS).find(k => 
      q.includes(k.toLowerCase()) || 
      q.includes(k.toLowerCase().replace("sitio ", ""))
    );

    if (matchedSitioKey) {
      const s = SITIO_DETAILS[matchedSitioKey];
      const rawSitioName = matchedSitioKey.replace("Sitio ", "").trim();

      // Live query for resident and family count in this sitio
      let liveResCount = 0;
      let liveFamCount = 0;
      try {
        const [rRes, fRes] = await Promise.all([
          supabase.from("residents").select("*", { count: "exact", head: true }).ilike("sitio", `%${rawSitioName}%`),
          supabase.from("family_data").select("*", { count: "exact", head: true }).ilike("sitio", `%${rawSitioName}%`)
        ]);
        liveResCount = rRes.count ?? 0;
        liveFamCount = fRes.count ?? 0;
      } catch {}

      return {
        text: cleanFormat(
          `📍 IMPORMASYON AT TALAAN PARA SA ${matchedSitioKey.toUpperCase()}:\n\n` +
          `• Eksaktong Coordinates: ${s.coords}\n` +
          `• Lokasyon: ${s.location}\n` +
          `• Mahalagang Palatandaan: ${s.landmarks}\n` +
          `• Nakatalagang BHW: ${s.assignedBhw}\n` +
          `• Telepono / Contact: 📞 ${s.contact}\n\n` +
          `📊 Kasalukuyang Datos sa Sistema:\n` +
          `• Rehistradong Residente: ${liveResCount.toLocaleString()} katao\n` +
          `• Naitalang Pamilya / Kabahayan: ${liveFamCount.toLocaleString()} pamilya\n\n` +
          `Maaari po ninyong tawagan si ${s.assignedBhw} kung kailangan ninyo ng tulong pangkalusugan sa ${matchedSitioKey}.`
        ),
        quickActions: [
          { label: `📞 Tawagan ang BHW`, query: `Contact details ni ${s.assignedBhw}` },
          { label: "📍 Lahat ng 11 Sitios", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" }
        ]
      };
    }

    if (q.includes("sitio") || q.includes("location") || q.includes("lokasyon") || q.includes("coordinates") || q.includes("saan") || q.includes("palatandaan")) {
      const sitioList = SUBUKIN_SITIOS.map((name, i) => {
        const detail = SITIO_DETAILS[`Sitio ${name}`] || SITIO_DETAILS[name];
        const coords = detail ? detail.coords : "Subukin Sector";
        const bhw = getAssignedSitio(name) || detail?.assignedBhw || "Barangay Health Staff";
        return `${i + 1}. Sitio ${name}\n   • Coordinates: ${coords}\n   • Nakatalagang BHW: ${bhw}`;
      }).join("\n\n");

      return {
        text: cleanFormat(
          `Ang Barangay Subukin, San Juan, Batangas (Coordinates: 13.72335° N, 121.44059° E) ay may 11 Opisyal na Sitio:\n\n${sitioList}\n\nMaaari po ninyong itanong ang partikular na Sitio (halimbawa: "Saan po ang Sitio Maligaya?") upang maibigay ko ang populasyon, palatandaan, at kontak ng BHW doon.`
        ),
        quickActions: [
          { label: "📍 Sitio Maligaya", query: "Saan po ang Sitio Maligaya?" },
          { label: "📍 Sitio Masigla", query: "Saan po ang Sitio Masigla?" },
          { label: "📍 Sitio Punta", query: "Saan po ang Sitio Matahimik Punta?" }
        ]
      };
    }

    // 12. BHW CONTACT DETAILS & TAUHAN
    const matchedWorker = BHW_PERSONNEL_LIST.find(w => 
      q.includes(w.name.toLowerCase()) || 
      q.includes(w.name.toLowerCase().split(" ")[0]) ||
      q.includes(w.name.toLowerCase().split(" ").slice(-1)[0])
    );

    if (matchedWorker) {
      return {
        text: cleanFormat(
          `👩‍⚕️ DETALYE AT KONTAK PARA KAY ${matchedWorker.name.toUpperCase()}:\n\n` +
          `• Buong Pangalan: ${matchedWorker.name}\n` +
          `• Tungkulin: ${matchedWorker.role}\n` +
          `• Itinalagang Lugar / Sitio: 📍 ${matchedWorker.sitio}\n` +
          `• Telepono / Mobile: 📞 ${matchedWorker.phone}\n` +
          `• Email: ✉️ ${matchedWorker.email}\n\n` +
          `Maaari po ninyo siyang tawagan o i-text sa ibinigay na numero para sa anumang pangangailangang pangkalusugan sa kanyang nasasakupan.`
        ),
        quickActions: [
          { label: "👩‍⚕️ Lahat ng BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "🕒 Shift Status", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" },
          { label: "🚨 Emergency Hotlines", query: "Ano-ano po ang emergency hotlines sa San Juan?" }
        ]
      };
    }

    if (q.includes("bhw") || q.includes("worker") || q.includes("tauhan") || q.includes("midwife") || q.includes("supervisor") || q.includes("contact") || q.includes("telepono") || q.includes("direktoryo") || q.includes("number")) {
      const bhwListText = BHW_PERSONNEL_LIST.map((w, idx) => 
        `${idx + 1}. ${w.name} (${w.role})\n   • Sitio: ${w.sitio}\n   • Telepono: 📞 ${w.phone}`
      ).join("\n\n");

      return {
        text: cleanFormat(
          `Opo, narito po ang Opisyal na Direktoryo ng mga Tauhan ng Kalusugan (BHW) ng Barangay Subukin:\n\n${bhwListText}\n\nOpisyal na Barangay Midwife: Mary Jane Landicho (0912-345-6789)\nBHW Supervisory: Cristeta R. Lanuza (0919-6980-712)\n\nMaaari po ninyo silang tawagan sa oras ng pangangailangan.`
        ),
        quickActions: [
          { label: "👩‍⚕️ Midwife Mary Jane", query: "Contact ni Mary Jane Landicho" },
          { label: "👩‍⚕️ Supervisor Cristeta", query: "Contact ni Cristeta R. Lanuza" },
          { label: "🚨 Emergency Numbers", query: "Ano-ano po ang emergency hotlines sa San Juan?" }
        ]
      };
    }

    // 13. RESIDENT SPECIFIC RECORD SUMMARY / SEARCH
    if (
      q.includes("residente") || 
      q.includes("resident") || 
      q.includes("buod") || 
      q.includes("summary") || 
      q.includes("rekord") || 
      q.includes("record") || 
      q.includes("talaan") ||
      q.includes("pasyente") ||
      q.includes("patient") ||
      q.includes("sino si") ||
      q.includes("search")
    ) {
      const cleanSearch = q
        .replace("summary of", "")
        .replace("summary ni", "")
        .replace("buod ng", "")
        .replace("buod ni", "")
        .replace("buod po ni", "")
        .replace("residente", "")
        .replace("resident", "")
        .replace("rekord ni", "")
        .replace("rekord ng", "")
        .replace("record of", "")
        .replace("talaan ni", "")
        .replace("talaan ng", "")
        .replace("sino si", "")
        .replace("search", "")
        .replace("po", "")
        .replace("paki-search", "")
        .trim();

      if (cleanSearch.length >= 2) {
        try {
          const { data: matchedResidents } = await supabase
            .from("residents")
            .select("*")
            .ilike("full_name", `%${cleanSearch}%`)
            .limit(3);

          if (matchedResidents && matchedResidents.length > 0) {
            const r = matchedResidents[0];

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

            let summaryText = `📋 BUOD NG REKORD NG RESIDENTE (Barangay Subukin):\n\n` +
              `• Buong Pangalan: ${r.full_name}\n` +
              `• Edad at Kasarian: ${r.age || "—"} taong gulang • ${r.sex || "—"}\n` +
              `• Araw ng Kapanganakan: ${r.birthdate ? new Date(r.birthdate).toLocaleDateString() : "—"}\n` +
              `• Tirahan / Sitio: 📍 ${r.sitio || "Barangay Subukin"}\n` +
              `• Katayuang Sibil: ${r.civil_status || "—"}\n` +
              `• Telepono: ${r.contact_number || "Walang naitalang numero"}\n` +
              `• PhilHealth No.: ${r.philhealth_number || "Wala pa po / N/A"}\n\n`;

            if (family) {
              summaryText += `🏠 Talaan ng Pamilya (Household):\n` +
                `• Pamilya #: ${family.family_number || "—"}\n` +
                `• Ulo ng Pamilya: ${family.father_name || family.mother_name || "—"}\n\n`;
            }

            if (consultations.length > 0) {
              summaryText += `🩺 Kamakailang Konsultasyon (${consultations.length} naitala):\n` +
                consultations.map((c: any) => 
                  `  - ${new Date(c.consultation_date).toLocaleDateString()}: ${c.consultation_cause || "Pangkalahatang Check-up"} (Vitals: ${c.pulse_rate ? `Pulse ${c.pulse_rate}` : ""} ${c.temperature ? `Temp ${c.temperature}°C` : ""})`
                ).join("\n") + "\n\n";
            } else {
              summaryText += `🩺 Konsultasyon: Wala pa pong naitalang dating konsultasyon sa Health Center.\n\n`;
            }

            if (maternal.length > 0) {
              summaryText += `🤰 Maternal Care: May aktibong talaan po ng pagbubuntis o prenatal check-up.\n\n`;
            }

            if (childHealth.length > 0) {
              summaryText += `👶 Child Health: May talaan po ng pagbabakuna at timbang ng bata.\n\n`;
            }

            if (philpen.length > 0) {
              const p = philpen[0];
              summaryText += `❤️ PhilPen NCD Screening: Naitalang Blood Pressure: ${p.bp || "Normal"}, Blood Sugar: ${p.blood_sugar || "N/A"}.\n\n`;
            }

            summaryText += `Kung nais po ninyong baguhin o dagdagan ang impormasyong ito, maaari pong pumunta sa pahina ng Resident Records o sumangguni sa ating BHW.`;

            return {
              text: cleanFormat(summaryText),
              quickActions: [
                { label: "👥 Iba pang Residente", query: "Maghanap ng ibang residente" },
                { label: "📊 Kabuuang Records", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
              ]
            };
          } else {
            return {
              text: cleanFormat(
                `🔍 Paumanhin po, wala po akong nahanap na residenteng tumutugma sa pangalang "${cleanSearch}" sa ating database.\n\nPaki-tiyak po ang wastong baybay ng pangalan o apelyido (halimbawa: "buod ni Juan Dela Cruz"), o maaari rin pong tingnan sa pahina ng Resident Records.`
              ),
              quickActions: [
                { label: "📊 Kabuuang Residente", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
                { label: "📍 Listahan ng Sitio", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" }
              ]
            };
          }
        } catch (e) {
          return {
            text: `Paumanhin po, nagkaroon po ng problema sa paghahanap sa database para sa pangalang "${cleanSearch}". Pakisubukang muli po.`
          };
        }
      } else {
        return {
          text: cleanFormat(
            `Upang maipakita ko po ang buod ng talaan ng isang residente o pasyente, paki-type po ang kanyang buong pangalan o apelyido.\n\nHalimbawa po:\n• Buod ng rekord ni Maria Santos\n• Talaan para kay Dela Cruz`
          ),
          quickActions: [
            { label: "📊 Ilan ang Residente?", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
          ]
        };
      }
    }

    // 14. EMERGENCY CONTACTS
    if (q.includes("emergency") || q.includes("sakuna") || q.includes("ambulansya") || q.includes("pulis") || q.includes("rescue") || q.includes("hospital") || q.includes("ospital") || q.includes("sunog") || q.includes("tulong")) {
      return {
        text: cleanFormat(
          `🚨 MGA OPISYAL NA EMERGENCY HOTLINES (San Juan, Batangas):\n\n` +
          `Itago po ninyo ang mga numerong ito para sa anumang agarang pangangailangan:\n\n` +
          `• 📞 Pambansang Emergency Hotline: 911\n` +
          `• 🚑 San Juan MDRRMO Rescue: 📞 0998-590-5102\n` +
          `• 🏥 Ambulansya (Municipal Health): 📞 0905-669-927\n` +
          `• 👮 San Juan Municipal Police Station: 📞 0915-385-0205\n` +
          `• 🚒 San Juan Fire Station (BFP): 📞 911 / MDRRMO\n` +
          `• 🏥 San Juan District Hospital: 📞 (043) 633-3756\n` +
          `• 🏥 San Juan Doctors' Hospital: 📞 (043) 575-3138\n` +
          `• 🏥 Divine Care Hospital: 📞 (043) 420-0062\n\n` +
          `Para sa tulong sa antas ng barangay, maaari pong tawagan agad ang ating Midwife na si Mary Jane Landicho sa 0912-345-6789 o si BHW Cristeta Lanuza sa 0919-6980-712.`
        ),
        quickActions: [
          { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "📍 Lokasyon ng Center", query: "Saan po ang Health Center?" }
        ]
      };
    }

    // 15. DENGUE INSPECTIONS & PREVENTION
    if (q.includes("dengue") || q.includes("lamok") || q.includes("kiti-kiti") || q.includes("larvae")) {
      try {
        const { count } = await supabase.from("dengue_prevention").select("*", { count: "exact", head: true });
        return {
          text: cleanFormat(
            `🦟 TALAAN NG DENGUE PREVENTION AT PAG-IINGAT LABAN SA LAMOK:\n\n` +
            `• Kabuuang Bahay na Nainspeksyon: ${(count || 0).toLocaleString()} kabahayan sa 11 Sitio.\n` +
            `• Pangunahing Programa: 4S Strategy ng Kagawaran ng Kalusugan:\n` +
            `   1. Search & Destroy: Itapon ang tubig sa mga lumang gulong, paso, at plorera.\n` +
            `   2. Self-Protection: Magsuot ng mahabang damit at pantalon, gumamit ng repellent o kulambo.\n` +
            `   3. Seek Early Consultation: Magpatingin agad sa Health Center kapag may lagnat na higit sa 2 araw.\n` +
            `   4. Say Yes to Fogging: Pumayag sa pagpapausok o fogging kung may banta ng dengue sa sitio.\n\n` +
            `Patuloy pong umiikot ang ating mga BHW upang tulungan ang bawat pamilya na mapanatiling ligtas at malinis ang kapaligiran.`
          ),
          quickActions: [
            { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
          ]
        };
      } catch {
        return { text: "Patuloy pong naitatala ang mga inspeksyon laban sa Dengue sa lahat ng Sitio ng Barangay Subukin." };
      }
    }

    // 16. ORAS NG HEALTH CENTER
    if (q.includes("oras") || q.includes("schedule") || q.includes("bukas") || q.includes("hours") || q.includes("kailan")) {
      return {
        text: cleanFormat(
          `🕒 ORAS NG PAGBUBUKAS AT SERBISYO NG BARANGAY SUBUKIN HEALTH CENTER:\n\n` +
          `• Lunes hanggang Biyernes: 8:00 AM hanggang 5:00 PM\n` +
          `• Sabado at Linggo: On-call po ang ating mga health staff para sa mga emergency at panganganak.\n` +
          `• Pinakamainam na Oras ng Check-up: Inirerekomenda pong pumunta sa umaga mula 8:30 AM hanggang 11:30 AM para sa prenatal, bakuna, at konsultasyon.\n` +
          `• Attendance ng mga BHW: Regular pong naka-duty ang ating mga BHW sa bawat Sitio at sa Health Center.\n\n` +
          `Huwag po kayong mag-atubiling dumulog sa Health Center para sa inyong mga pangangailangang medikal!`
        ),
        quickActions: [
          { label: "👩‍⚕️ Tawagan si Midwife", query: "Contact ni Mary Jane Landicho" },
          { label: "📍 Saan ang Health Center?", query: "Saan po matatagpuan ang Barangay Health Center?" }
        ]
      };
    }

    // 17. MAGALANG NA PAGBATI (GREETINGS)
    if (
      q === "hi" || 
      q === "hello" || 
      q === "kamusta" || 
      q === "kumusta" || 
      q === "magandang araw" || 
      q === "magandang umaga" || 
      q === "magandang hapon" || 
      q === "magandang gabi" || 
      q === "salamat" || 
      q === "maraming salamat" ||
      q === "thanks"
    ) {
      return {
        text: cleanFormat(
          `Magandang araw po sa inyo! Ako po si BHAI (Barangay Health AI). Isang malaking karangalan po ang makapaglingkod at tumulong sa inyo. 😊\n\nAno po ang nais ninyong malaman o masilip sa ating mga talaan ng kalusugan, mga residente, o mga sitio sa Barangay Subukin?`
        ),
        quickActions: [
          { label: "📊 Ilan ang Talaan?", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
          { label: "👩‍⚕️ Sino ang Naka-Duty?", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" },
          { label: "📍 Saan ang mga Sitio?", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
          { label: "👵 Serbisyo sa Senior?", query: "Ano-ano po ang serbisyong pangkalusugan para sa senior citizen?" }
        ]
      };
    }

    // 18. DEEP DYNAMIC SYSTEM INSPECTION (Para sa anumang tanong sa labas ng mga pre-set na sagot)
    // Sinasaliksik nito ang database para magbigay ng eksaktong impormasyon
    try {
      // Maghanap sa residents, families, consultations, at BHW workers gamit ang query terms
      const searchTerms = q.split(" ").filter(t => t.length > 2 && !["ang", "mga", "ano", "sino", "saan", "bakit", "paano", "kung", "may", "wala", "nila", "namin", "natin", "inyo", "tayo", "dito"].includes(t));
      const primaryTerm = searchTerms[0] || q;

      const [resSearch, famSearch, consSearch, matSearch] = await Promise.all([
        supabase.from("residents").select("*").or(`full_name.ilike.%${primaryTerm}%,sitio.ilike.%${primaryTerm}%,philhealth_number.ilike.%${primaryTerm}%`).limit(3),
        supabase.from("family_data").select("*").or(`father_name.ilike.%${primaryTerm}%,mother_name.ilike.%${primaryTerm}%,family_number.ilike.%${primaryTerm}%,sitio.ilike.%${primaryTerm}%`).limit(2),
        supabase.from("consultations").select("*").or(`consultation_cause.ilike.%${primaryTerm}%,diagnosis.ilike.%${primaryTerm}%`).limit(3),
        supabase.from("maternal_care" as any).select("*").ilike("patient_name", `%${primaryTerm}%`).limit(2)
      ]);

      const foundRes = resSearch.data || [];
      const foundFam = famSearch.data || [];
      const foundCons = consSearch.data || [];
      const foundMat = (matSearch.data as any[]) || [];

      if (foundRes.length > 0 || foundFam.length > 0 || foundCons.length > 0 || foundMat.length > 0) {
        let inspectText = `🔍 MGA NATAGPUANG TALA SA SISTEMA PARA SA "${primaryTerm.toUpperCase()}":\n\n`;

        if (foundRes.length > 0) {
          inspectText += `👥 Talaan ng Residente:\n`;
          foundRes.forEach((r: any) => {
            inspectText += `• ${r.full_name} (${r.age || "—"} taong gulang) — Sitio: ${r.sitio || "Subukin"}\n`;
          });
          inspectText += `\n`;
        }

        if (foundFam.length > 0) {
          inspectText += `🏠 Talaan ng Pamilya:\n`;
          foundFam.forEach((f: any) => {
            inspectText += `• Pamilya #${f.family_number || "—"}: ${f.father_name || "Ama"} at ${f.mother_name || "Ina"} (${f.sitio || "Subukin"})\n`;
          });
          inspectText += `\n`;
        }

        if (foundCons.length > 0) {
          inspectText += `🩺 Konsultasyon:\n`;
          foundCons.forEach((c: any) => {
            inspectText += `• Reklamo/Sakit: ${c.consultation_cause || "Check-up"} (${new Date(c.consultation_date).toLocaleDateString()})\n`;
          });
          inspectText += `\n`;
        }

        if (foundMat.length > 0) {
          inspectText += `🤰 Maternal Records:\n`;
          foundMat.forEach((m: any) => {
            inspectText += `• ${m.patient_name || "Pasyente"} — Sitio: ${m.sitio || "Subukin"}\n`;
          });
          inspectText += `\n`;
        }

        inspectText += `Nais po ba ninyong suriin ang buong rekord ng alinman sa mga ito?`;

        return {
          text: cleanFormat(inspectText),
          quickActions: [
            { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
            { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at kanilang kontak?" }
          ]
        };
      }
    } catch {}

    // 19. Intelligent Guidance kapag hindi natagpuan (May malinaw na gabay sa kawani)
    return {
      text: cleanFormat(
        `Naiintindihan ko po ang inyong katanungan! Ako po si BHAI, ang opisyal na Barangay Health AI para sa Barangay Subukin.\n\n` +
        `Siniyasat ko po ang ating database ng Residente, Pamilya, Konsultasyon, at BHW Staff, ngunit kailangan ko po ng kaunting paglilinaw upang maibigay ang eksaktong datos.\n\n` +
        `Maaari po ninyong itanong:\n` +
        `1. 📊 Kabuuang Datos — "Ilan po ang kabuuang rekord sa ating sistema?"\n` +
        `2. 🤰 Buntis at Sanggol — "Ilan po ang mga buntis o may bakuna?"\n` +
        `3. 👤 Pangalan ng Residente — I-type ang buong pangalan tulad ng "Buod ni [Pangalan]"\n` +
        `4. 📍 Sitio at Populasyon — "Ilan ang tao sa Sitio Maligaya?"\n` +
        `5. 👩‍⚕️ Attendance ng BHW — "Sino-sino ang naka-duty ngayon?"\n` +
        `6. 💡 Tulong sa Paggamit — "Paano magdagdag ng residente o mag-print?"\n\n` +
        `Pindutin lamang po ang mga pindutan sa ibaba para sa agarang tulong!`
      ),
      quickActions: [
        { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
        { label: "👩‍⚕️ Naka-Duty Ngayon", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" },
        { label: "🤰 Talaan ng Buntis", query: "Ilan po ang mga buntis sa ating talaan?" },
        { label: "📍 Listahan ng Sitios", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" }
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
        text: "Paumanhin po, nagkaroon po ng kaunting pagkaantala sa pagsagot. Pakisubukang muli po sa ilang sandali.",
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
        text: "Bagong usapan po! Ako po muli si BHAI (Barangay Health AI). Paano po ako makakatulong sa inyo ngayon sa mga talaan ng kalusugan, mga buntis, bakuna, o mga sitio sa Barangay Subukin?",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: [
          { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
          { label: "👩‍⚕️ Naka-Duty Ngayon", query: "Sino-sino po ang mga BHW na naka-duty ngayon?" },
          { label: "🤰 Talaan ng Buntis", query: "Ilan po ang mga buntis sa ating talaan?" },
          { label: "📍 Listahan ng Sitio", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" }
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Chat Trigger Button - Only the icon is visible as requested */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center group">
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              setUnreadCount(0);
            }}
            className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary/95 to-sky-600 text-primary-foreground shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30 border-2 border-white/50 dark:border-primary/40 cursor-pointer"
            aria-label="Buksan ang BHAI Chatbot"
            title="BHAI - Barangay Health AI"
          >
            <BhaiIcon size={34} className="text-white drop-shadow-sm" />
            
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
              : "bottom-4 sm:bottom-6 w-[calc(100vw-2rem)] sm:w-[450px] h-[610px] max-h-[88vh]"
          }`}
        >
          {/* Chat Window Header */}
          <div className="p-3.5 bg-gradient-to-r from-primary/15 via-primary/10 to-sky-500/15 border-b border-border/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-10 w-10 rounded-full bg-background border border-primary/30 p-0.5 shadow-sm shrink-0 flex items-center justify-center">
                <BhaiIcon size={30} />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-heading font-bold text-base text-foreground tracking-tight truncate">
                    BHAI
                  </h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-primary/20 font-bold">
                    Barangay Health AI
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gabay sa Kalusugan • Barangay Subukin
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
                title="Simulan muli ang usapan"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              {/* Minimize / Expand */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:text-foreground hover:bg-muted/60"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Palakihin" : "Paliitin"}
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                onClick={() => setIsOpen(false)}
                title="Isara ang chat"
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
                    <HelpCircle className="h-3.5 w-3.5 text-primary" />
                    Mga Karaniwang Katanungan (FAQ):
                  </span>
                  <button 
                    onClick={() => setShowFaqDrawer(!showFaqDrawer)}
                    className="text-primary hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    {showFaqDrawer ? "Itago" : "Lahat ng FAQ"}
                  </button>
                </div>

                {/* Horizontal Quick Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {FAQ_QUESTIONS.slice(0, 5).map(faq => (
                    <button
                      key={faq.id}
                      onClick={() => handleSendMessage(faq.query)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-card hover:bg-primary/10 hover:text-primary border border-border/50 text-foreground transition-all shrink-0 shadow-2xs active:scale-95 flex items-center gap-1 cursor-pointer"
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
                        className="w-full text-left p-2 rounded-lg bg-card/80 hover:bg-primary/10 border border-border/40 text-xs font-medium text-foreground transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="truncate pr-2">{faq.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message History Stream */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 text-xs sm:text-sm">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-start gap-2 max-w-[92%]">
                      {msg.sender === "bot" && (
                        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 shrink-0 mt-0.5 flex items-center justify-center">
                          <BhaiIcon size={18} />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl p-3 shadow-2xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                            : "bg-muted/50 border border-border/40 text-foreground rounded-tl-xs whitespace-pre-wrap"
                        }`}
                      >
                        {/* Render clean text without asterisks */}
                        {msg.text.split("\n").map((rawLine, idx) => {
                          const line = rawLine.replace(/\*\*/g, "").replace(/\*/g, "");
                          if (line.startsWith("• ") || line.startsWith("- ")) {
                            return (
                              <p key={idx} className="my-0.5 pl-2 border-l-2 border-primary/40 font-medium">
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
                                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-background hover:bg-primary hover:text-white border border-border/40 text-foreground transition-all shadow-2xs active:scale-95 cursor-pointer"
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
                      <BhaiIcon size={18} />
                    </div>
                    <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-tl-xs p-3 shadow-2xs flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                      <span className="text-xs ml-1 font-medium italic">
                        Sumasangguni sa database ng barangay...
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
                    placeholder="Magtanong po kay BHAI (hal. buod ng pasyente, sitio, kontak ng BHW)..."
                    className="h-10 text-xs sm:text-sm bg-background/80 border-border/60 focus-visible:ring-primary/40 rounded-xl"
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
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 mt-1.5">
                  <span className="truncate">
                    💡 Pindutin ang FAQ o i-type ang pangalan ng residente para sa buod
                  </span>
                  <span className="font-semibold text-primary/80 shrink-0 ml-1">
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

// Backwards compatibility alias
export const AteBhwChatbot = BhaiChatbot;
export default BhaiChatbot;
