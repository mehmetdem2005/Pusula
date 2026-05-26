/**
 * Icon Component
 * ==============
 *
 * Tüm sistem iconları için tek bir component. Lucide React Native kullanıyor.
 * Emoji yerine SVG iconları — tutarlı, tema renklerine uygun, retina-friendly.
 *
 * Emojiler sadece şu yerlerde kullanılır:
 *   - Subject avatar (kullanıcının seçtiği) — 🇩🇪 🧮 ⚗️ vb
 *   - Mood/Energy ölçeği (😊 🪫 ⚡ vb — duygusal anlam taşıyor)
 *   - Sohbette doğal text emojiler (:) xd :( ;))
 *   - Achievement rozet ikonları (🏆 🔥 — kültürel anlam)
 *
 * Geri kalan tüm UI elemanlarında <Icon name="..." /> kullanılır.
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  // Social / Brand
  Apple,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  Atom,
  Award,
  BarChart3,
  Beaker,
  Bell,
  BellOff,
  BookOpen,
  BookText,
  Bookmark,
  // Learning
  Brain,
  Building,
  // Subject icons (Lucide)
  Calculator,
  // Time / Calendar
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  // Navigation / Layout
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Chrome,
  Clipboard,
  Clock,
  // Tech
  Code,
  // Misc
  Coffee,
  Compass,
  Cpu,
  Crown,
  Dna,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Facebook,
  File,
  // Documents / Media
  FileText,
  Filter,
  Flag,
  Flame,
  FlaskConical,
  Folder,
  FolderOpen,
  Gift,
  Github,
  Globe,
  GraduationCap,
  Headphones,
  Heart,
  HelpCircle,
  // Tab bar
  Home,
  Hourglass,
  Image as ImageIcon,
  Inbox,
  Info,
  Instagram,
  Key,
  Languages,
  Layers,
  Library as LibraryIcon,
  Lightbulb,
  Link2,
  Linkedin,
  Lock,
  LogOut,
  type LucideIcon,
  // Auth
  Mail,
  Map,
  MapPin,
  Medal,
  Menu,
  // Communication
  MessageCircle,
  MessageSquare,
  // Voice / Audio
  Mic,
  MicOff,
  Microscope,
  Monitor,
  Moon,
  MoreHorizontal,
  MoreVertical,
  Music,
  Network,
  Palette,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  PieChart,
  Pin,
  Pizza,
  Play,
  // Actions
  Plus,
  RefreshCw,
  Repeat,
  RotateCw,
  Scroll,
  ScrollText,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SkipForward,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Tag,
  Target,
  Telescope,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash2,
  TreePine,
  TrendingDown,
  // Status
  TrendingUp,
  Trophy,
  Twitter,
  Unlock,
  Upload,
  User,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  XCircle,
  Zap,
} from 'lucide-react-native'

const ICONS: Record<string, LucideIcon> = {
  // Navigation
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  x: X,
  menu: Menu,

  // Tab
  home: Home,
  'book-open': BookOpen,
  'refresh-cw': RefreshCw,
  pencil: Pencil,
  user: User,

  // Actions
  plus: Plus,
  search: Search,
  settings: Settings,
  filter: Filter,
  trash: Trash2,
  edit: Edit3,
  share: Share2,
  download: Download,
  upload: Upload,
  bookmark: Bookmark,
  star: Star,
  heart: Heart,
  'more-h': MoreHorizontal,
  'more-v': MoreVertical,
  check: Check,
  'alert-circle': AlertCircle,

  // Auth
  mail: Mail,
  lock: Lock,
  unlock: Unlock,
  phone: Phone,
  key: Key,
  logout: LogOut,
  shield: ShieldCheck,
  eye: Eye,
  'eye-off': EyeOff,

  // Learning
  brain: Brain,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  target: Target,
  flag: Flag,
  compass: Compass,
  'map-pin': MapPin,
  map: Map,
  layers: Layers,
  network: Network,
  zap: Zap,
  sparkles: Sparkles,
  award: Award,
  trophy: Trophy,
  medal: Medal,

  // Voice
  mic: Mic,
  'mic-off': MicOff,
  volume: Volume2,
  'volume-off': VolumeX,
  play: Play,
  pause: Pause,
  'skip-forward': SkipForward,
  'skip-back': SkipBack,
  headphones: Headphones,

  // Documents
  'file-text': FileText,
  file: File,
  image: ImageIcon,
  camera: Camera,
  paperclip: Paperclip,
  folder: Folder,
  'folder-open': FolderOpen,
  inbox: Inbox,
  clipboard: Clipboard,
  'scroll-text': ScrollText,

  // Time
  calendar: Calendar,
  clock: Clock,
  timer: Timer,
  hourglass: Hourglass,
  sunrise: Sunrise,
  sunset: Sunset,
  moon: Moon,
  sun: Sun,

  // Communication
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  send: Send,
  'at-sign': AtSign,
  bell: Bell,
  'bell-off': BellOff,

  // Status
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  'bar-chart': BarChart3,
  'pie-chart': PieChart,
  activity: Activity,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  info: Info,
  'help-circle': HelpCircle,

  // Tech
  code: Code,
  cpu: Cpu,
  globe: Globe,
  wifi: Wifi,
  'wifi-off': WifiOff,
  smartphone: Smartphone,
  monitor: Monitor,

  // Brand
  apple: Apple,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  github: Github,
  chrome: Chrome,
  linkedin: Linkedin,

  // Subject
  calculator: Calculator,
  'flask-conical': FlaskConical,
  dna: Dna,
  atom: Atom,
  languages: Languages,
  palette: Palette,
  music: Music,
  scroll: Scroll,
  'book-text': BookText,
  building: Building,
  microscope: Microscope,
  telescope: Telescope,
  'tree-pine': TreePine,
  beaker: Beaker,
  library: LibraryIcon,

  // Misc
  coffee: Coffee,
  pizza: Pizza,
  pin: Pin,
  link: Link2,
  tag: Tag,
  gift: Gift,
  crown: Crown,
  flame: Flame,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  repeat: Repeat,
  rotate: RotateCw,
  shuffle: Shuffle,
}

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName | string
  size?: number
  color?: string
  strokeWidth?: number
  fill?: string
}

export function Icon({
  name,
  size = 20,
  color = '#1E1B4B',
  strokeWidth = 2,
  fill = 'none',
}: IconProps) {
  const Component = ICONS[name as IconName]
  if (!Component) {
    if (__DEV__) console.warn(`[Icon] Bilinmeyen icon: "${name}"`)
    return null
  }
  return <Component size={size} color={color} strokeWidth={strokeWidth} fill={fill} />
}

/** Tam icon listesi — IDE autocomplete için */
export const ICON_NAMES = Object.keys(ICONS) as IconName[]
