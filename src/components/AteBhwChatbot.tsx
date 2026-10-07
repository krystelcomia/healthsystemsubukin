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
        text: "Magandang araw po sa inyo! Ako po si **BHAI** (Barangay Health AI), ang inyong magalang na katulong sa kalusugan at datos ng Barangay Subukin. 😊\n\nNandito po ako upang tulungan kayo. Maaari po ninyong itanong sa akin ang:\n\n• 📊 **Kabuuang bilang ng mga talaan** (residente, konsultasyon, pamilya, atbp.)\n• 👤 **Buod ng rekord ng isang pasyente o residente** (i-type lamang po ang buong pangalan)\n• 📍 **Lokasyon, palatandaan, at coordinates ng bawat Sitio**\n• 👩‍⚕️ **Direktoryo at contact number ng ating mga BHW at Midwife**\n• 👴 **Serbisyo at tulong para sa mga Senior Citizen**\n• 🚨 **Emergency hotline at ambulansya sa San Juan, Batangas**\n\nMaaari po ninyong pindutin ang alinman sa mga tanong (FAQ) sa itaas o direktang i-type ang inyong katanungan sa ibaba!",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: [
          { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
          { label: "📍 Listahan ng Sitio", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
          { label: "👩‍⚕️ Kontak ng mga BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "👴 Serbisyo sa Senior", query: "Ano-ano po ang serbisyong pangkalusugan para sa senior citizen?" }
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

  // Comprehensive Data Answering Engine sa Magalang na Tagalog para sa mga Nakatatanda
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
          `Opo, narito po ang kasalukuyang **Opisyal na Talaan at Estadistika** sa sistema ng kalusugan ng Barangay Subukin:\n\n` +
          `📁 **Kabuuang Tala sa Database: ${grandTotal.toLocaleString()} mga rekord**\n\n` +
          `• 👥 **Mga Rehistradong Residente:** ${rTotal.toLocaleString()} katao\n` +
          `• 🏠 **Mga Pamilya at Kabahayan (Census):** ${fTotal.toLocaleString()} pamilya\n` +
          `• 🩺 **Konsultasyon at Check-up:** ${cTotal.toLocaleString()} rekord\n` +
          `• 🤰 **Maternal Care (Para sa mga Buntis):** ${mTotal.toLocaleString()} rekord\n` +
          `• 👶 **Kalusugan ng Bata at Bakuna:** ${chTotal.toLocaleString()} rekord\n` +
          `• 👨‍👩‍👧 **Family Planning Records:** ${fpTotal.toLocaleString()} rekord\n` +
          `• 🦟 **Dengue Prevention Inspections:** ${dTotal.toLocaleString()} bahay\n` +
          `• ❤️ **PhilPen NCD Screening (Presyon at Sugar):** ${pTotal.toLocaleString()} rekord\n` +
          `• 👩‍⚕️ **Mga Kawani / BHW Workers:** ${wTotal} tauhan\n` +
          `• 📝 **Naitalang Activity Logs ng Sistema:** ${rawActivityLogs.length}\n` +
          `• 🕒 **Attendance Check-ins ng mga BHW:** ${rawAttendance.length}\n\n` +
          `*Lahat po ng datos na ito ay ligtas na nakatala at regular na ina-update ng ating mga masisipag na Barangay Health Workers.*`;

        return {
          text: responseText,
          quickActions: [
            { label: "📍 Listahan ng Sitios", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
            { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at kanilang kontak?" },
            { label: "👴 Serbisyo sa Senior", query: "Ano-ano po ang serbisyong pangkalusugan para sa senior citizen?" }
          ]
        };
      } catch (err) {
        return {
          text: "Paumanhin po, nagkaroon po ng sandaling aberya sa pagkuha ng tala sa database. Pakisubukang muli po sa ilang sandali."
        };
      }
    }

    // 2. MGA SERBISYO PARA SA MGA SENIOR CITIZEN AT NAKATATANDA
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
      return {
        text: `👴👵 **Mga Serbisyong Pangkalusugan para sa ating mga Senior Citizen sa Barangay Subukin:**\n\n` +
          `Lubos pong pinahahalagahan ng ating barangay ang kalusugan ng ating mga lolo at lola. Narito po ang mga regular na tulong na maaari ninyong matanggap:\n\n` +
          `1. 🩺 **Libreng Pagkuha ng Presyon ng Dugo (Blood Pressure Check):**\n` +
          `   • Maaari po kayong magpakuha ng BP sa Health Center o sa BHW na nakatalaga sa inyong Sitio anumang oras.\n\n` +
          `2. ❤️ **PhilPen Risk Assessment Screening:**\n` +
          `   • Pagsusuri para sa diabetes, sakit sa puso, at altapresyon upang maagapan ang anumang karamdaman.\n\n` +
          `3. 💊 **Tulong sa Maintenance Medicines:**\n` +
          `   • Kapag may alokasyon mula sa San Juan Rural Health Unit (RHU), ipinamamahagi po ang mga libreng maintenance para sa high blood at diabetes sa Health Center.\n\n` +
          `4. 🚶‍♂️ **Home Visit ng BHW:**\n` +
          `   • Kung nahihirapan na po kayong maglakad o bumiyahe, maaaring bisitahin kayo sa inyong tahanan ng nakatalagang BHW sa inyong sitio.\n\n` +
          `*May partikular po ba kayong nararamdaman o nais na ikonsulta sa ating Midwife o BHW?*`,
        quickActions: [
          { label: "👩‍⚕️ Tawagan ang BHW", query: "Sino-sino po ang mga BHW at ano ang telepono?" },
          { label: "🕒 Oras ng Health Center", query: "Ano po ang oras ng Health Center?" },
          { label: "🚨 Emergency Hotlines", query: "Ano-ano po ang emergency hotlines sa San Juan?" }
        ]
      };
    }

    // 3. PARTIKULAR NA SITIO O LOKASYON
    const matchedSitioKey = Object.keys(SITIO_DETAILS).find(k => 
      q.includes(k.toLowerCase()) || 
      q.includes(k.toLowerCase().replace("sitio ", ""))
    );

    if (matchedSitioKey) {
      const s = SITIO_DETAILS[matchedSitioKey];
      return {
        text: `📍 **Impormasyon at Lokasyon para sa ${matchedSitioKey}:**\n\n` +
          `• **Eksaktong Coordinates:** \`${s.coords}\`\n` +
          `• **Lokasyon:** ${s.location}\n` +
          `• **Mahalagang Palatandaan:** ${s.landmarks}\n` +
          `• **Nakatalagang BHW:** **${s.assignedBhw}**\n` +
          `• **Telepono / Contact:** 📞 **${s.contact}**\n\n` +
          `Maaari po ninyong tawagan si **${s.assignedBhw}** kung kailangan ninyo ng tulong pangkalusugan sa ${matchedSitioKey}. May nais pa po ba kayong itanong?`,
        quickActions: [
          { label: `📞 Kontakin si ${s.assignedBhw.split(" ")[0]}`, query: `Contact details ni ${s.assignedBhw}` },
          { label: "📍 Lahat ng 11 Sitios", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" }
        ]
      };
    }

    if (q.includes("sitio") || q.includes("location") || q.includes("lokasyon") || q.includes("coordinates") || q.includes("saan") || q.includes("palatandaan")) {
      const sitioList = SUBUKIN_SITIOS.map((name, i) => {
        const detail = SITIO_DETAILS[`Sitio ${name}`] || SITIO_DETAILS[name];
        const coords = detail ? detail.coords : "Subukin Sector";
        const bhw = getAssignedSitio(name) || detail?.assignedBhw || "Barangay Health Staff";
        return `**${i + 1}. Sitio ${name}**\n   • Coordinates: \`${coords}\`\n   • Nakatalagang BHW: **${bhw}**`;
      }).join("\n\n");

      return {
        text: `Ang **Barangay Subukin, San Juan, Batangas** (Coordinates: \`13.72335° N, 121.44059° E\`) ay may **11 Opisyal na Sitio**:\n\n${sitioList}\n\n*Maaari po ninyong itanong ang partikular na Sitio (halimbawa: "Saan po ang Sitio Maligaya?") upang maibigay ko po ang eksaktong palatandaan at kontak ng BHW doon.*`,
        quickActions: [
          { label: "📍 Sitio Maligaya", query: "Saan po ang Sitio Maligaya?" },
          { label: "📍 Sitio Masigla", query: "Saan po ang Sitio Masigla?" },
          { label: "📍 Sitio Punta", query: "Saan po ang Sitio Matahimik Punta?" }
        ]
      };
    }

    // 4. BHW CONTACT DETAILS & TAUHAN
    const matchedWorker = BHW_PERSONNEL_LIST.find(w => 
      q.includes(w.name.toLowerCase()) || 
      q.includes(w.name.toLowerCase().split(" ")[0]) ||
      q.includes(w.name.toLowerCase().split(" ").slice(-1)[0])
    );

    if (matchedWorker) {
      return {
        text: `👩‍⚕️ **Detalye at Kontak para kay ${matchedWorker.name}:**\n\n` +
          `• **Buong Pangalan:** **${matchedWorker.name}**\n` +
          `• **Tungkulin:** ${matchedWorker.role}\n` +
          `• **Itinalagang Lugar / Sitio:** 📍 **${matchedWorker.sitio}**\n` +
          `• **Telepono / Mobile:** 📞 **${matchedWorker.phone}**\n` +
          `• **Email:** ✉️ \`${matchedWorker.email}\`\n\n` +
          `Kung mayroon po kayong katanungan o kailangan sa kanyang nasasakupan, maaari po ninyo siyang direktang tawagan o i-text sa ibinigay na numero.`,
        quickActions: [
          { label: "👩‍⚕️ Lahat ng BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "🚨 Emergency Hotlines", query: "Ano-ano po ang emergency hotlines sa San Juan?" }
        ]
      };
    }

    if (q.includes("bhw") || q.includes("worker") || q.includes("tauhan") || q.includes("midwife") || q.includes("supervisor") || q.includes("contact") || q.includes("telepono") || q.includes("direktoryo") || q.includes("number")) {
      const bhwListText = BHW_PERSONNEL_LIST.map((w, idx) => 
        `**${idx + 1}. ${w.name}** (${w.role})\n   • Sitio: **${w.sitio}**\n   • Telepono: 📞 **${w.phone}**`
      ).join("\n\n");

      return {
        text: `Opo, narito po ang **Opisyal na Direktoryo ng mga Tauhan ng Kalusugan (BHW)** ng Barangay Subukin:\n\n${bhwListText}\n\n*Opisyal na Barangay Midwife:* **Mary Jane Landicho** (0912-345-6789)\n*BHW Supervisory:* **Cristeta R. Lanuza** (0919-6980-712)\n\n*Maaari po ninyo silang tawagan sa oras ng pangangailangan.*`,
        quickActions: [
          { label: "👩‍⚕️ Midwife Mary Jane", query: "Contact ni Mary Jane Landicho" },
          { label: "👩‍⚕️ Supervisor Cristeta", query: "Contact ni Cristeta R. Lanuza" },
          { label: "🚨 Emergency Numbers", query: "Ano-ano po ang emergency hotlines sa San Juan?" }
        ]
      };
    }

    // 5. RESIDENT SPECIFIC RECORD SUMMARY / SEARCH
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

            let summaryText = `📋 **Buod ng Rekord ng Residente sa Barangay Subukin:**\n\n` +
              `• **Buong Pangalan:** **${r.full_name}**\n` +
              `• **Edad at Kasarian:** ${r.age || "—"} taong gulang • ${r.sex || "—"}\n` +
              `• **Araw ng Kapanganakan:** ${r.birthdate ? new Date(r.birthdate).toLocaleDateString() : "—"}\n` +
              `• **Tirahan / Sitio:** 📍 **${r.sitio || "Barangay Subukin"}**\n` +
              `• **Katayuang Sibil:** ${r.civil_status || "—"}\n` +
              `• **Telepono:** ${r.contact_number || "Walang naitalang numero"}\n` +
              `• **PhilHealth No.:** ${r.philhealth_number || "Wala pa po / N/A"}\n\n`;

            if (family) {
              summaryText += `🏠 **Talaan ng Pamilya (Household):**\n` +
                `• Pamilya #: ${family.family_number || "—"}\n` +
                `• Ulo ng Pamilya: ${family.father_name || family.mother_name || "—"}\n\n`;
            }

            if (consultations.length > 0) {
              summaryText += `🩺 **Kamakailang Konsultasyon (${consultations.length} naitala):**\n` +
                consultations.map((c: any) => 
                  `  - *${new Date(c.consultation_date).toLocaleDateString()}*: ${c.consultation_cause || "Pangkalahatang Check-up"} (Vitals: ${c.pulse_rate ? `Pulse ${c.pulse_rate}` : ""} ${c.temperature ? `Temp ${c.temperature}°C` : ""})`
                ).join("\n") + "\n\n";
            } else {
              summaryText += `🩺 **Konsultasyon:** Wala pa pong naitalang dating konsultasyon sa Health Center.\n\n`;
            }

            if (maternal.length > 0) {
              summaryText += `🤰 **Maternal Care:** May aktibong talaan po ng pagbubuntis o prenatal check-up.\n\n`;
            }

            if (childHealth.length > 0) {
              summaryText += `👶 **Child Health:** May talaan po ng pagbabakuna at timbang ng bata.\n\n`;
            }

            if (philpen.length > 0) {
              const p = philpen[0];
              summaryText += `❤️ **PhilPen NCD Screening:** Naitalang Blood Pressure: ${p.bp || "Normal"}, Blood Sugar: ${p.blood_sugar || "N/A"}.\n\n`;
            }

            summaryText += `*Kung nais po ninyong baguhin o dagdagan ang impormasyong ito, maaari pong pumunta sa pahina ng Resident Records o sumangguni sa ating BHW.*`;

            return {
              text: summaryText,
              quickActions: [
                { label: "👥 Iba pang Residente", query: "Maghanap ng ibang residente" },
                { label: "📊 Kabuuang Records", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
              ]
            };
          } else {
            return {
              text: `🔍 Paumanhin po, wala po akong nahanap na residenteng tumutugma sa pangalang **"${cleanSearch}"** sa ating database.\n\nPaki-tiyak po ang wastong baybay ng pangalan o apelyido (halimbawa: *"buod ni Juan Dela Cruz"*), o maaari rin pong tingnan sa pahina ng Resident Records.`,
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
          text: `Upang maipakita ko po ang **buod ng talaan ng isang residente o pasyente**, paki-type po ang kanyang buong pangalan o apelyido.\n\nHalimbawa po:\n• *"Buod ng rekord ni Maria Santos"*\n• *"Talaan para kay Dela Cruz"*`,
          quickActions: [
            { label: "📊 Ilan ang Residente?", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
          ]
        };
      }
    }

    // 6. EMERGENCY CONTACTS
    if (q.includes("emergency") || q.includes("sakuna") || q.includes("ambulansya") || q.includes("pulis") || q.includes("rescue") || q.includes("hospital") || q.includes("ospital") || q.includes("sunog") || q.includes("tulong")) {
      return {
        text: `🚨 **Mga Opisyal na Emergency Hotlines (San Juan, Batangas):**\n\n` +
          `Itago po ninyo ang mga numerong ito para sa anumang agarang pangangailangan:\n\n` +
          `• 📞 **Pambansang Emergency Hotline:** **911**\n` +
          `• 🚑 **San Juan MDRRMO Rescue:** 📞 **0998-590-5102**\n` +
          `• 🏥 **Ambulansya (Municipal Health):** 📞 **0905-669-927**\n` +
          `• 👮 **San Juan Municipal Police Station:** 📞 **0915-385-0205**\n` +
          `• 🚒 **San Juan Fire Station (BFP):** 📞 **911 / MDRRMO**\n` +
          `• 🏥 **San Juan District Hospital:** 📞 **(043) 633-3756**\n` +
          `• 🏥 **San Juan Doctors' Hospital:** 📞 **(043) 575-3138**\n` +
          `• 🏥 **Divine Care Hospital:** 📞 **(043) 420-0062**\n\n` +
          `*Para po sa tulong sa antas ng barangay, maaari pong tawagan agad ang ating Midwife na si Mary Jane Landicho sa 0912-345-6789 o si BHW Cristeta Lanuza sa 0919-6980-712.*`,
        quickActions: [
          { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "📍 Lokasyon ng Health Center", query: "Saan po ang Health Center?" }
        ]
      };
    }

    // 7. DENGUE INSPECTIONS & PREVENTION
    if (q.includes("dengue") || q.includes("lamok") || q.includes("kiti-kiti") || q.includes("larvae")) {
      try {
        const { count } = await supabase.from("dengue_prevention").select("*", { count: "exact", head: true });
        return {
          text: `🦟 **Talaan ng Dengue Prevention at Pag-iingat Laban sa Lamok:**\n\n` +
          `• **Kabuuang Bahay na Nainspeksyon:** **${(count || 0).toLocaleString()} kabahayan** sa 11 Sitio.\n` +
          `• **Pangunahing Programa:** 4S Strategy ng Kagawaran ng Kalusugan:\n` +
          `   1. **Search & Destroy:** Itapon ang tubig sa mga lumang gulong, paso, at plorera.\n` +
          `   2. **Self-Protection:** Magsuot ng mahabang pantalon at damit, gumamit ng mosquito repellent o kulambo.\n` +
          `   3. **Seek Early Consultation:** Magpatingin agad sa Health Center kapag may lagnat na higit sa 2 araw.\n` +
          `   4. **Say Yes to Fogging:** Pumayag sa pagpapausok o fogging kung may banta ng dengue sa sitio.\n\n` +
          `Patuloy pong umiikot ang ating mga BHW upang tulungan ang bawat pamilya na mapanatiling malinis ang kapaligiran.`,
          quickActions: [
            { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" }
          ]
        };
      } catch {
        return { text: "Patuloy pong naitatala ang mga inspeksyon laban sa Dengue sa lahat ng Sitio ng Barangay Subukin." };
      }
    }

    // 8. ORAS NG HEALTH CENTER AT ATTENDANCE
    if (q.includes("oras") || q.includes("schedule") || q.includes("attendance") || q.includes("shift") || q.includes("bukas") || q.includes("hours") || q.includes("kailan")) {
      return {
        text: `🕒 **Oras ng Pagbubukas at Serbisyo ng Barangay Subukin Health Center:**\n\n` +
          `• **Lunes hanggang Biyernes:** 8:00 AM hanggang 5:00 PM\n` +
          `• **Sabado at Linggo:** On-call po ang ating mga health staff para sa mga emergency at panganganak.\n` +
          `• **Pinakamainam na Oras ng Check-up:** Inirerekomenda pong pumunta sa umaga mula 8:30 AM hanggang 11:30 AM para sa prenatal, bakuna, at konsultasyon.\n` +
          `• **Attendance ng mga BHW:** Naka-integrate po sa sistema gamit ang Clock In / Clock Out shift tracker upang matiyak ang regular na serbisyo.\n\n` +
          `Huwag po kayong mag-atubiling dumulog sa Health Center para sa inyong mga pangangailangang medikal!`,
        quickActions: [
          { label: "👩‍⚕️ Tawagan si Midwife", query: "Contact ni Mary Jane Landicho" },
          { label: "📍 Saan ang Health Center?", query: "Saan po matatagpuan ang Barangay Health Center?" }
        ]
      };
    }

    // 9. MAGALANG NA PAGBATI (GREETINGS)
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
        text: `Magandang araw po sa inyo! Ako po si **BHAI** (Barangay Health AI). Isang malaking karangalan po ang makapaglingkod at tumulong sa inyo. 😊\n\nAno po ang nais ninyong malaman o masilip sa ating mga talaan ng kalusugan, mga residente, o mga sitio sa Barangay Subukin?`,
        quickActions: [
          { label: "📊 Ilan ang Talaan?", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
          { label: "📍 Saan ang mga Sitio?", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
          { label: "👩‍⚕️ Kontak ng mga BHW?", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "👴 Serbisyo sa Senior?", query: "Ano-ano po ang serbisyong pangkalusugan para sa senior citizen?" }
        ]
      };
    }

    // 10. INTELLIGENT RESIDENT NAME FALLBACK (Pangalan ng tao na direktang inilagay)
    const words = q.split(" ").filter(w => w.length > 2 && w !== "saan" && w !== "sino" && w !== "ilan" && w !== "bakit");
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
            text: `Natagpuan ko po ang talaan para kay **${r.full_name}**:\n\n` +
              `• **Edad at Kasarian:** ${r.age || "—"} taong gulang • ${r.sex || "—"}\n` +
              `• **Sitio:** 📍 **${r.sitio || "Barangay Subukin"}**\n` +
              `• **Kapanganakan:** ${r.birthdate ? new Date(r.birthdate).toLocaleDateString() : "—"}\n` +
              `• **PhilHealth No.:** ${r.philhealth_number || "Wala pa po"}\n\n` +
              `Nais po ba ninyong makita ang kanyang buong klinikal na buod (konsultasyon, bakuna, o talaan ng pamilya)?`,
            quickActions: [
              { label: `📋 Buong Buod ni ${r.full_name.split(" ")[0]}`, query: `Buod ng rekord ni ${r.full_name}` }
            ]
          };
        }
      } catch {}
    }

    // Default Guidance na Magalang para sa mga Nakatatanda
    return {
      text: `Naiintindihan ko po kayo! Ako po si **BHAI**, ang opisyal na **Barangay Health AI** para sa Barangay Subukin.\n\nUpang matulungan ko po kayo nang mabilis at maayos, maaari po kayong magtanong tungkol sa:\n\n` +
        `1. 📊 **Kabuuang Talaan** — *"Ilan po ang kabuuang rekord sa ating sistema?"*\n` +
        `2. 👤 **Rekord ng Residente** — *"Ibigay po ang buod ng rekord ni [Pangalan]"*\n` +
        `3. 📍 **Lokasyon ng Sitio** — *"Saan po matatagpuan ang Sitio [Pangalan]?"*\n` +
        `4. 👩‍⚕️ **Kontak ng mga BHW** — *"Sino po ang BHW sa Sitio Maligaya at ano ang kontak?"*\n` +
        `5. 👴 **Serbisyo sa Senior** — *"Ano-ano po ang programa para sa senior citizen?"*\n` +
        `6. 🚨 **Emergency Hotlines** — *"Ano-ano po ang numero ng ambulansya at ospital?"*\n\n` +
        `Maaari rin po ninyong pindutin ang mga pindutan sa ibaba para sa mabilisang sagot!`,
      quickActions: [
        { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
        { label: "📍 Listahan ng Sitios", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
        { label: "👩‍⚕️ Direktoryo ng BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
        { label: "👴 Serbisyo sa Senior", query: "Ano-ano po ang serbisyong pangkalusugan para sa senior citizen?" }
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
        text: "Bagong usapan po! Ako po muli si **BHAI** (Barangay Health AI). Paano po ako makakatulong sa inyo ngayon sa mga talaan ng kalusugan o sitio sa Barangay Subukin?",
        timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        quickActions: [
          { label: "📊 Kabuuang Talaan", query: "Ilan po ang kabuuang bilang ng records sa sistema?" },
          { label: "📍 Listahan ng Sitio", query: "Saan-saan po matatagpuan ang mga Sitio sa Barangay Subukin?" },
          { label: "👩‍⚕️ Kontak ng mga BHW", query: "Sino-sino po ang mga BHW at ang kanilang telepono?" },
          { label: "👴 Serbisyo sa Senior", query: "Ano-ano po ang serbisyong pangkalusugan para sa senior citizen?" }
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
          {/* Friendly prompt bubble tailored for elderly users */}
          <div className="hidden sm:flex items-center gap-2 bg-card/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-primary/20 text-xs font-semibold text-foreground animate-bounce-subtle pointer-events-none">
            <Sparkles className="h-4 w-4 text-amber-500 animate-spin-slow shrink-0" />
            <span>
              May katanungan po ba kayo? Kausapin po si BHAI!
            </span>
          </div>

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
                        {/* Parse bold and bullets for nice rendering */}
                        {msg.text.split("\n").map((line, idx) => {
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
