import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  Compass,
  Flame,
  Handshake,
  Heart,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  Newspaper,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Video,
} from 'lucide-react';
import { ONEPIECE_CARDS_DB } from '../game/onePieceData';
import { POKEMON_CARDS_DB, PokemonCard, ShopState } from '../game/pokemonShopLogic';
import { CityHuntSpot, MarketPulseEvent, getLuxuryAssetBuffs } from '../game/shopExpansionSystems';
import { soundManager } from '../game/audio';

interface PlayerSocialListing {
  id: string;
  card: PokemonCard;
  askingPrice: number;
  caption: string;
  createdAtLabel: string;
  buyerOfferName: string;
  buyerOfferPrice: number;
  status: 'open' | 'sold';
}

interface ThreadComment {
  id: string;
  author: string;
  handle: string;
  isShop?: boolean;
  text: string;
  time: string;
}

interface OverpricedListingItem {
  id: string;
  kind: 'overpriced';
  sellerName: string;
  locationName: string;
  caption: string;
  card: PokemonCard;
  marketValue: number;
  askingPrice: number;
  sellerPatience: number;
  haggledCount: number;
  maxHaggles: number;
  status: 'active' | 'sold' | 'walked_away';
  timeLabel: string;
  initialComments: ThreadComment[];
}

interface CommunityQuestionPost {
  id: string;
  kind: 'community';
  authorName: string;
  badgeLabel: string;
  caption: string;
  card?: PokemonCard;
  timeLabel: string;
  baseLikes: number;
  baseReposts: number;
  initialComments: ThreadComment[];
}

interface CheapStealPost {
  id: string;
  kind: 'cheap_deal';
  spotId: string;
  timeLabel: string;
  initialComments: ThreadComment[];
}

interface PressNewsPost {
  id: string;
  kind: 'press_news';
  outletName: string;
  outletHandle: string;
  categoryLabel: string;
  pulse: MarketPulseEvent;
  timeLabel: string;
  baseLikes: number;
  baseReposts: number;
  initialComments: ThreadComment[];
}

type FeedTimelineItem = CommunityQuestionPost | OverpricedListingItem | CheapStealPost;

interface CardSocialFeedViewProps {
  shopState: ShopState;
  onHaggleCityHunt: (spotId: string, discountPct: number) => void;
  onBuyCityHunt: (spotId: string) => void;
  onRefreshCityHunts: () => void;
  onRefreshMarketPulses?: () => void;
  onOpenPokeLive?: () => void;
  onNavigateToPoi: (poiId: string, name: string, x: number, z: number) => void;
  onSellBinderCard?: (cardId: string, cardName: string, price: number) => void;
  onBuyOverpricedCard?: (card: PokemonCard, price: number, sellerName: string) => void;
  onBack: () => void;
}

const ALL_CARDS_POOL: PokemonCard[] = [...POKEMON_CARDS_DB, ...ONEPIECE_CARDS_DB];
const ALL_CARDS_LOOKUP: Map<string, PokemonCard> = (() => {
  const map = new Map<string, PokemonCard>();
  for (const c of ALL_CARDS_POOL) map.set(c.id, c);
  return map;
})();

const COMMUNITY_POST_TEMPLATES: Array<{
  author: string;
  badge: string;
  caption: string;
  attachCard: boolean;
  replies: Array<{ author: string; text: string }>;
}> = [
  {
    author: 'Minh Thẻ Bài Q1',
    badge: 'Hỏi Giá',
    caption: 'Anh em cho hỏi lá này hiện tại giao dịch khoảng bao nhiêu thì hợp lý ạ? Mình mới bóc được tối qua nên chưa rành giá lắm 🤔',
    attachCard: true,
    replies: [
      { author: 'Tuấn Collector', text: 'Tầm giá thị trường chuẩn đó bác, nếu đẹp không trầy góc thì giữ lại đi!' },
      { author: 'Hùng Chợ Thẻ', text: 'Đừng bán hớ nhé, check kỹ mép thẻ trước khi chốt.' },
    ],
  },
  {
    author: 'Linh Grand Line',
    badge: 'Check Real / Fake',
    caption: 'Mọi người soi giúp mình viền foil với chữ in góc dưới lá này có chuẩn hàng auth không ạ? Mua pass lại nên hơi run tay 😅',
    attachCard: true,
    replies: [
      { author: 'Khôi PSA 10', text: 'Nhìn texture vân nổi nét căng thế kia thì chuẩn auth 100% rồi yên tâm nhé.' },
    ],
  },
  {
    author: 'Quang Bóc Pack',
    badge: 'Khoe Pull',
    caption: 'Vừa ghé tiệm làm đúng 2 pack giải trí cuối tuần mà nổ phát này tay run bần bật luôn anh em ơi 🔥🔥🔥',
    attachCard: true,
    replies: [
      { author: 'Nam Sài Gòn', text: 'Xin vía tay thơm với bác ơi!!' },
      { author: 'Duy One Piece', text: 'Đỉnh thực sự, cho vào toploader ngay đi không xước.' },
    ],
  },
  {
    author: 'Bảo Sưu Tầm',
    badge: 'Hỏi Grading',
    caption: 'Thẻ Raw giá tầm $40-$60 có nên gửi đi chấm PSA/CGC không mấy bác hay để binder ngắm cho đỡ tốn phí ạ?',
    attachCard: false,
    replies: [
      { author: 'Thành Vintage', text: 'Nếu ưng artwork thì đóng slab trưng cũng đẹp, còn đầu tư thì đợi lá trên $80 hẳn gửi.' },
    ],
  },
  {
    author: 'Khang Hunter',
    badge: 'Cần Mua (WTB)',
    caption: 'Đang cần tìm mua gấp vài lá Alt Art / Secret Rare hệ lửa & hải tặc khu vực trung tâm, ai có hàng giá hợp lý tag mình nhé! 👀',
    attachCard: false,
    replies: [
      { author: 'Đức Trader', text: 'Lên chợ xem thử đi bác, nay thấy mấy ông toàn đăng giá trên trời thôi haha.' },
    ],
  },
  {
    author: 'Hải Đăng TCG',
    badge: 'Thảo Luận',
    caption: 'Công nhận dạo này lướt chợ mạng toàn thấy mấy bác rao giá x2 thị trường 😂 Kiếm được kèo giá rẻ đúng kiểu mò kim đáy bể luôn.',
    attachCard: false,
    replies: [
      { author: 'Vũ Bờ Bắc', text: 'Chuẩn luôn, phải chịu khó F5 lướt tin mới săn được kèo thơm 2-5%.' },
    ],
  },
  {
    author: 'Trang PokéFan',
    badge: 'Hỏi Kinh Nghiệm',
    caption: 'Cho em hỏi giữa bảo quản thẻ trong sleeve + toploader với hộp magnetic one-touch thì cái nào chống cong ẩm tốt hơn ạ?',
    attachCard: false,
    replies: [
      { author: 'Long Collector', text: 'Mùa ẩm cứ double sleeve + bỏ hộp chống ẩm là an toàn nhất bạn ơi.' },
    ],
  },
  {
    author: 'Phúc Nika',
    badge: 'Hỏi Card',
    caption: 'Lá này thuộc bản in nào vậy mọi người? Thấy artwork đẹp quá định sưu tầm đủ bộ luôn mà tìm thông tin hơi loạn.',
    attachCard: true,
    replies: [
      { author: 'Sơn OP09', text: 'Bản này dễ nhận biết qua mã góc dưới bên phải đó bác!' },
    ],
  },
  {
    author: 'An Bình Thạnh',
    badge: 'Khoe Góc Chơi',
    caption: 'Cuối tuần rảnh rỗi lôi hết thẻ trong binder ra sắp lại theo màu sắc. Nhìn đã con mắt thật sự anh em ạ ✨',
    attachCard: true,
    replies: [
      { author: 'Tài CardShop', text: 'Quá chỉn chu! Còn thiếu lá nào cứ ra tiệm tìm thêm nhé.' },
    ],
  },
  {
    author: 'Tiến Arena',
    badge: 'Tìm Đối Đấu',
    caption: 'Tối nay có anh em nào lên tầng 2 đánh giải giao lưu deck mới không? Nghe bảo nay bàn đấu đông vui lắm ⚔️',
    attachCard: false,
    replies: [
      { author: 'Hoàng Deck', text: 'Có mình nhé, 8h tối lên test deck mới luôn!' },
    ],
  },
  {
    author: 'My Sưu Tầm',
    badge: 'Hỏi Giá',
    caption: 'Em có lá này cất tủ 2 năm rồi góc vẫn bén đét, nếu mang ra shop trade hoặc bán lại thì tầm giá thị trường hiện tại ổn áp không ạ?',
    attachCard: true,
    replies: [
      { author: 'Cường Appraisal', text: 'Giữ form đẹp vậy là cộng điểm rồi, tham khảo giá thị trường trước khi chốt nhé.' },
    ],
  },
  {
    author: 'Đạt Katinat',
    badge: 'Chuyện Bên Lề',
    caption: 'Ngồi cafe mở 5 pack xịt cả 5 nhưng vẫn vui vì được gặp mấy anh em cùng đam mê giao lưu thẻ bài ☕🃏',
    attachCard: false,
    replies: [
      { author: 'Trung AEON', text: 'Chơi thẻ vui ở chỗ cộng đồng mà bác, lần sau nổ bù!' },
    ],
  },
  {
    author: 'Hoàng Huyết Long',
    badge: 'So Sánh Set',
    caption: 'Theo anh em set mới tháng này tỉ lệ ra hit cao hơn hay set cũ vẫn giữ giá trị sưu tầm lâu dài hơn?',
    attachCard: false,
    replies: [
      { author: 'Bình Grail', text: 'Set cũ ít hàng nên về dài vẫn giữ giá tốt hơn nhiều.' },
    ],
  },
  {
    author: 'Vinh SunWheel',
    badge: 'Check Centering',
    caption: 'Mấy cao nhân chấm điểm giùm em độ lệch viền (centering) lá này với, liệu có cơ hội lên được 9.5 hay 10 không ạ? 🔍',
    attachCard: true,
    replies: [
      { author: 'Kiên Grader', text: 'Viền trái hơi dày nhẹ xíu xiu, nhưng mặt sau sạch thì vẫn 9-9.5 ngon lành.' },
    ],
  },
];

const OVERPRICED_SELLERS = [
  { name: 'Đại Gia Thẻ Cổ', location: 'Quận 1 Center', caption: 'Hàng sưu tầm để tủ kính lâu năm, đúng giá sưu tầm mới gả chứ không bán vội nhé 💎' },
  { name: 'Thương Lái Phố Cổ', location: 'Chợ Bến Thành', caption: 'Thẻ cực hiếm trên thị trường cháy hàng rồi, giá này là giá tương lai đó mấy bác 🔥' },
  { name: 'Nam Flexer', location: 'Landmark 81', caption: 'Vừa bóc nóng hổi chưa qua tay ai, tự tin 10 điểm hoàn hảo nên xin phép đăng giá cao chút!' },
  { name: 'Bác Sưu Tầm VIP', location: 'AEON Mall', caption: 'Ai trả rẻ khỏi nhắn mất công nhé, hàng kỷ niệm bán được giá mới chia tay em nó 👑' },
  { name: 'Huy HypeBeast', location: 'Thảo Điền', caption: 'Set này sắp hết in rồi, om sang tháng sau còn lên nữa. Chốt nhanh kẻo lỡ!' },
  { name: 'Tuấn Đầu Cơ', location: 'Phố Đi Bộ', caption: 'Bán cho người thực sự đam mê và hiểu giá trị lá bài, miễn so sánh giá sàn ạ ✨' },
  { name: 'Khoa Rare Hunter', location: 'Sun Wheel', caption: 'Lá đẹp không một hạt bụi, định giá theo cảm xúc người giữ kỷ niệm nên giá hơi căng tí 😅' },
  { name: 'Long Obsidian', location: 'Nhà Thờ Đức Bà', caption: 'Thấy bên Nhật đang đẩy giá lên kinh lắm, mình treo giá đón đầu xu hướng trước luôn!' },
];

const PRESS_OUTLETS = [
  { name: 'TCG Times Việt Nam', handle: '@tcgtimes_vn', category: 'BÁO THỊ TRƯỜNG TCG' },
  { name: 'PokéMarket Wire', handle: '@pokemarket_wire', category: 'TẠP CHÍ ĐẦU TƯ THẺ' },
  { name: 'Grand Line Economy', handle: '@grandline_eco', category: 'BẢN TIN GIÁ TRỊ THẺ' },
  { name: 'Sài Gòn Collector Press', handle: '@sg_cardpress', category: 'TIN TỨC SƯU TẦM' },
];

function toHandle(name: string): string {
  return (
    '@' +
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

function getAvatarGradient(seed: string): string {
  const gradients = [
    'from-amber-500 to-rose-600',
    'from-sky-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-orange-500 to-red-600',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

function buildSocialFeedStream(
  huntSpots: CityHuntSpot[],
  forceShowOneDeal: boolean = false
): FeedTimelineItem[] {
  const highPool = ALL_CARDS_POOL.filter((c) => (c.marketPrice || 0) >= 25);
  const cardPool = highPool.length > 0 ? highPool : ALL_CARDS_POOL;
  const timeLabels = ['2p', '5p', '9p', '14p', '21p', '34p', '48p', '1g', '2g', '3g'];

  // 1. ~14 Community Q&A / Discussion / Price Check / Flex Posts (~62% of feed)
  const shuffledCommunity = [...COMMUNITY_POST_TEMPLATES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 14);

  const communityItems: CommunityQuestionPost[] = shuffledCommunity.map((tpl, idx) => {
    const attachedCard = tpl.attachCard
      ? cardPool[Math.floor(Math.random() * cardPool.length)]
      : undefined;
    return {
      id: `comm_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
      kind: 'community',
      authorName: tpl.author,
      badgeLabel: tpl.badge,
      caption: tpl.caption,
      card: attachedCard,
      timeLabel: timeLabels[idx % timeLabels.length],
      baseLikes: 12 + Math.floor(Math.random() * 88),
      baseReposts: 1 + Math.floor(Math.random() * 14),
      initialComments: tpl.replies.map((r, ri) => ({
        id: `cinit_${idx}_${ri}`,
        author: r.author,
        handle: toHandle(r.author),
        text: r.text,
        time: `${2 + ri * 3}p`,
      })),
    };
  });

  // 2. 8 Overpriced ("Giá Trên Trời") Card Listings (~34% of feed)
  const shuffledSellers = [...OVERPRICED_SELLERS].sort(() => Math.random() - 0.5);
  const overpricedItems: OverpricedListingItem[] = shuffledSellers.map((seller, idx) => {
    const card = cardPool[Math.floor(Math.random() * cardPool.length)];
    const marketValue = Math.max(18, Math.round(card.marketPrice || 40));
    const markupPct = 0.35 + Math.random() * 1.05; // +35% to +140% ABOVE market price!
    const askingPrice = Math.round(marketValue * (1 + markupPct));
    const comments: ThreadComment[] =
      idx % 2 === 0
        ? [
            {
              id: `op_c_${idx}`,
              author: 'Dân Chơi TCG',
              handle: '@danchoi_tcg',
              text: `Giá thị trường tầm $${marketValue} mà bác rao $${askingPrice} hơi căng quá rồi 😂`,
              time: '4p',
            },
          ]
        : [];
    return {
      id: `over_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
      kind: 'overpriced',
      sellerName: seller.name,
      locationName: seller.location,
      caption: seller.caption,
      card,
      marketValue,
      askingPrice,
      sellerPatience: 100,
      haggledCount: 0,
      maxHaggles: 2,
      status: 'active',
      timeLabel: timeLabels[(idx + 2) % timeLabels.length],
      initialComments: comments,
    };
  });

  // 3. Rare 2–5% Cheap Deals ("Giá Rẻ / Kèo Thơm"):
  // Across ~22-23 total posts, 1 rare deal = ~4.3% of the feed (right inside 2-5%)!
  // On natural scroll/refresh, roll ~45% chance that 1 rare active steal appears on this batch (so ~2% per post overall).
  const activeSpots = huntSpots.filter((s) => s.status === 'active');
  const closedSpots = huntSpots.filter((s) => s.status !== 'active');
  const cheapDealItems: CheapStealPost[] = [];

  const shouldShowRareDeal = forceShowOneDeal || Math.random() < 0.55;
  if (activeSpots.length > 0 && shouldShowRareDeal) {
    const chosen = activeSpots[Math.floor(Math.random() * activeSpots.length)];
    cheapDealItems.push({
      id: `deal_${chosen.id}`,
      kind: 'cheap_deal',
      spotId: chosen.id,
      timeLabel: 'Mới đăng',
      initialComments: [],
    });
  } else if (closedSpots.length > 0 && Math.random() < 0.35) {
    // Occasionally show a recently sold/closed deal so players see past steals exist
    const chosen = closedSpots[0];
    cheapDealItems.push({
      id: `deal_${chosen.id}`,
      kind: 'cheap_deal',
      spotId: chosen.id,
      timeLabel: '25p',
      initialComments: [],
    });
  }

  // Merge and shuffle naturally so cheap steals don't sit predictably at index 0
  const combined: FeedTimelineItem[] = [...communityItems, ...overpricedItems];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  if (cheapDealItems.length > 0) {
    // Insert the rare cheap deal organically somewhere between slot 3 and 16
    const insertIdx = Math.min(combined.length, 3 + Math.floor(Math.random() * 12));
    combined.splice(insertIdx, 0, ...cheapDealItems);
  }

  return combined;
}

export const CardSocialFeedView: React.FC<CardSocialFeedViewProps> = ({
  shopState,
  onHaggleCityHunt,
  onBuyCityHunt,
  onRefreshCityHunts,
  onRefreshMarketPulses,
  onOpenPokeLive,
  onNavigateToPoi,
  onSellBinderCard,
  onBuyOverpricedCard,
  onBack,
}) => {
  const [feedTab, setFeedTab] = useState<'for_you' | 'press_news' | 'sell_listings' | 'community' | 'my_shop'>('for_you');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [repostedIds, setRepostedIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [openThreadIds, setOpenThreadIds] = useState<Record<string, boolean>>({});
  const [threadComments, setThreadComments] = useState<Record<string, ThreadComment[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Persistent feed items for current browser view (can be refreshed freely like F5 on X/Threads!)
  const [feedItems, setFeedItems] = useState<FeedTimelineItem[]>(() =>
    buildSocialFeedStream(shopState.cityHuntSpots || [], true)
  );
  const [overpricedOverrides, setOverpricedOverrides] = useState<Record<string, OverpricedListingItem>>({});
  const [overpricedOfferDrafts, setOverpricedOfferDrafts] = useState<Record<string, number>>({});

  // Player "Đăng Bài Bán Thẻ Từ Sổ Thẻ" state
  const [showComposerPicker, setShowComposerPicker] = useState<boolean>(false);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [customCaption, setCustomCaption] = useState<string>('');
  const [playerListings, setPlayerListings] = useState<PlayerSocialListing[]>([]);

  const huntSpots = shopState.cityHuntSpots || [];
  const huntSpotsSignature = huntSpots.map((s) => `${s.id}:${s.status}`).join('|');
  const pendingRadarRefreshRef = useRef(false);

  useEffect(() => {
    if (!pendingRadarRefreshRef.current) return;
    pendingRadarRefreshRef.current = false;
    setOverpricedOverrides({});
    setFeedItems(buildSocialFeedStream(huntSpots, true));
  }, [huntSpotsSignature, huntSpots]);

  const huntSpotMap = useMemo(() => {
    const m = new Map<string, CityHuntSpot>();
    for (const s of huntSpots) m.set(s.id, s);
    return m;
  }, [huntSpots]);

  const assetBuffs = getLuxuryAssetBuffs(shopState.ownedLuxuryAssets || []);
  const pulses = shopState.marketPulseNews || [];

  const pressNewsPosts: PressNewsPost[] = useMemo(() => {
    return pulses.map((pulse, idx) => {
      const outlet = PRESS_OUTLETS[idx % PRESS_OUTLETS.length];
      return {
        id: `press_${pulse.id}_${idx}`,
        kind: 'press_news',
        outletName: outlet.name,
        outletHandle: outlet.handle,
        categoryLabel: outlet.category,
        pulse,
        timeLabel: idx === 0 ? 'Tin Nóng • 12p' : 'Cập Nhật • 35p',
        baseLikes: 84 + idx * 31,
        baseReposts: 26 + idx * 14,
        initialComments: [
          {
            id: `pr_c_${pulse.id}`,
            author: pulse.isBullish ? 'Tuấn Đầu Tư' : 'Hùng Săn Kèo',
            handle: pulse.isBullish ? '@tuan_dautu' : '@hung_sankeo',
            text: pulse.isBullish
              ? `Tin này ra là anh em chuẩn bị đẩy hàng lên kệ với sàn đấu giá ngay kẻo lỡ sóng!`
              : `Giá thị trường đang hạ nhiệt, tranh thủ gom thẻ đẹp vào kho chờ tăng lại anh em ơi.`,
            time: '6p',
          },
        ],
      };
    });
  }, [pulses]);

  const regenerateFeed = useCallback(
    (forceRareDeal: boolean) => {
      setOverpricedOverrides({});
      setFeedItems(buildSocialFeedStream(shopState.cityHuntSpots || [], forceRareDeal));
    },
    [shopState.cityHuntSpots]
  );

  const handleFreeFeedReload = () => {
    soundManager.playSelectSound();
    regenerateFeed(false);
  };

  const handlePaidRadarScan = () => {
    if (shopState.cash < 20) return;
    soundManager.playSelectSound();
    pendingRadarRefreshRef.current = true;
    onRefreshCityHunts();
  };

  // Sync cheap_deal items if cityHuntSpots regenerated and old spotId no longer exists
  const resolvedFeedItems = useMemo(() => {
    const activeSpot = huntSpots.find((h) => h.status === 'active');
    return feedItems
      .map((item) => {
        if (item.kind === 'overpriced' && overpricedOverrides[item.id]) {
          return overpricedOverrides[item.id];
        }
        if (item.kind === 'cheap_deal') {
          const spot = huntSpotMap.get(item.spotId);
          if (!spot && activeSpot) {
            return { ...item, spotId: activeSpot.id };
          }
          if (!spot) return null;
        }
        return item;
      })
      .filter((x): x is FeedTimelineItem => x !== null);
  }, [feedItems, overpricedOverrides, huntSpotMap, huntSpots]);

  const ownedBinderCards = useMemo(() => {
    const entries: Array<{ card: PokemonCard; qty: number }> = [];
    const binder = shopState.binderCards || {};
    for (const [cardId, qty] of Object.entries(binder)) {
      if (qty > 0) {
        const card = ALL_CARDS_LOOKUP.get(cardId);
        if (card) entries.push({ card, qty });
      }
    }
    return entries.sort((a, b) => (b.card.marketPrice || 0) - (a.card.marketPrice || 0));
  }, [shopState.binderCards]);

  const filteredPressPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pressNewsPosts;
    return pressNewsPosts.filter(
      (p) =>
        p.outletName.toLowerCase().includes(q) ||
        p.pulse.headline.toLowerCase().includes(q) ||
        p.pulse.advice.toLowerCase().includes(q) ||
        p.pulse.badge.toLowerCase().includes(q)
    );
  }, [pressNewsPosts, searchQuery]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resolvedFeedItems.filter((item) => {
      if (feedTab === 'my_shop' || feedTab === 'press_news') return false;
      if (feedTab === 'community' && item.kind !== 'community') return false;
      if (feedTab === 'sell_listings' && item.kind === 'community') return false;
      if (!q) return true;

      if (item.kind === 'community') {
        return (
          item.authorName.toLowerCase().includes(q) ||
          item.caption.toLowerCase().includes(q) ||
          item.badgeLabel.toLowerCase().includes(q) ||
          (item.card?.name.toLowerCase().includes(q) ?? false)
        );
      }
      if (item.kind === 'overpriced') {
        return (
          item.sellerName.toLowerCase().includes(q) ||
          item.locationName.toLowerCase().includes(q) ||
          item.caption.toLowerCase().includes(q) ||
          item.card.name.toLowerCase().includes(q)
        );
      }
      const spot = huntSpotMap.get(item.spotId);
      if (!spot) return false;
      return (
        spot.card.name.toLowerCase().includes(q) ||
        spot.sellerName.toLowerCase().includes(q) ||
        spot.locationName.toLowerCase().includes(q) ||
        spot.storyText.toLowerCase().includes(q)
      );
    });
  }, [resolvedFeedItems, feedTab, searchQuery, huntSpotMap]);

  const activeCheapDealCount = resolvedFeedItems.filter((item) => {
    if (item.kind !== 'cheap_deal') return false;
    const s = huntSpotMap.get(item.spotId);
    return s?.status === 'active';
  }).length;

  const sellListingsCount = resolvedFeedItems.filter((i) => i.kind !== 'community').length;

  const handleHaggleCheapDeal = (spot: CityHuntSpot) => {
    const prevPrice = spot.askingPrice;
    const prevCount = spot.haggledCount;
    onHaggleCityHunt(spot.id, 0.12);

    const targetPrice = Math.max(spot.minAcceptablePrice, Math.round(prevPrice * 0.88));
    setOpenThreadIds((prev) => ({ ...prev, [spot.id]: true }));
    setThreadComments((prev) => ({
      ...prev,
      [spot.id]: [
        ...(prev[spot.id] || []),
        {
          id: `c_${Date.now()}_${prevCount}`,
          author: 'PokéCard Flagship',
          handle: '@pokecard_shop',
          isShop: true,
          text: `Gửi bác kèo chốt nhanh -12% còn $${targetPrice.toLocaleString()} nhé! Giao dịch ngay trong ngày 🤝`,
          time: 'Vừa xong',
        },
      ],
    }));
  };

  const getOverpricedOfferSuccessProb = (offerPrice: number, marketValue: number, askingPrice: number): number => {
    if (offerPrice >= askingPrice) return 1.0;
    const mv = Math.max(1, marketValue);
    if (offerPrice >= mv) {
      const span = Math.max(1, askingPrice - mv);
      const t = Math.max(0, Math.min(1, (offerPrice - mv) / span));
      // Exactly 20% at Market Price, rising toward 55% near askingPrice
      return 0.20 + t * 0.35;
    }
    const lossPct = ((mv - offerPrice) / mv) * 100; // e.g. 10 = -10%, 20 = -20%
    if (lossPct <= 10) {
      // Between 0% and -10% below market: drops sharply from 14% down to 5%
      const t = lossPct / 10;
      return 0.14 - t * 0.09;
    }
    if (lossPct <= 20) {
      // Between -10% and -20% below market: 5% down to 2%
      const t = (lossPct - 10) / 10;
      return 0.05 - t * 0.03;
    }
    // Lower than -20%: ultra-slim 1%..2%
    return 0.015;
  };

  const handleHaggleOverpriced = (item: OverpricedListingItem, offerPriceInput?: number) => {
    if (item.status !== 'active' || item.haggledCount >= item.maxHaggles) return;
    const minSlider = Math.max(1, Math.round(item.marketValue * 0.75));
    const proposed = Math.max(
      minSlider,
      Math.min(item.askingPrice, Math.round(offerPriceInput ?? overpricedOfferDrafts[item.id] ?? item.marketValue))
    );
    const successProb = getOverpricedOfferSuccessProb(proposed, item.marketValue, item.askingPrice);
    const succeeded = Math.random() < successProb;
    const patienceHit =
      proposed < item.marketValue * 0.88
        ? 55
        : proposed <= item.marketValue
        ? 45
        : 30;
    const nextPatience = succeeded ? Math.max(20, item.sellerPatience - 25) : item.sellerPatience - patienceHit;

    let updated: OverpricedListingItem;
    let replyMsg: string;

    if (succeeded) {
      soundManager.playWinChime();
      updated = {
        ...item,
        askingPrice: proposed,
        haggledCount: item.haggledCount + 1,
        sellerPatience: nextPatience,
      };
      replyMsg =
        proposed < item.marketValue
          ? `Thôi kẹt tiền gấp nên mình cắn răng bán lỗ cho shop $${proposed.toLocaleString()} luôn đó, bấm Chốt Mua ngay kẻo mình đổi ý! 😭🤝`
          : proposed === item.marketValue
          ? `Chốt luôn $${proposed.toLocaleString()} đúng giá thị trường cho gọn, nể shop uy tín đó! 🤝`
          : `Ok bớt xuống $${proposed.toLocaleString()} cho shop nhiệt tình nhé!`;
    } else if (nextPatience <= 0 || item.haggledCount + 1 >= item.maxHaggles) {
      soundManager.playWrongBuzzer();
      updated = {
        ...item,
        haggledCount: item.haggledCount + 1,
        sellerPatience: Math.max(0, nextPatience),
        status: 'walked_away',
      };
      replyMsg =
        proposed < item.marketValue
          ? `Trả thấp dưới giá thị trường thế này ai mà bán nổi bạn ơi! Mình giữ sưu tầm luôn 💢`
          : `Giá đó mình chưa nhượng được rồi, xin phép giữ lại chơi tiếp nha! 💢`;
    } else {
      soundManager.playSelectSound();
      const slight = Math.max(item.marketValue + 1, Math.round(item.askingPrice * 0.92));
      updated = {
        ...item,
        askingPrice: slight,
        haggledCount: item.haggledCount + 1,
        sellerPatience: nextPatience,
      };
      replyMsg =
        proposed < item.marketValue
          ? `Không bán lỗ đâu bác ơi! Thiện chí lắm mình hạ nhẹ xuống $${slight.toLocaleString()} thôi.`
          : `Giá thị trường chưa bay được đâu bạn, mình giảm còn $${slight.toLocaleString()} nhé.`;
    }

    setOverpricedOverrides((prev) => ({ ...prev, [item.id]: updated }));
    setOpenThreadIds((prev) => ({ ...prev, [item.id]: true }));
    setThreadComments((prev) => ({
      ...prev,
      [item.id]: [
        ...(prev[item.id] || []),
        {
          id: `oh_u_${Date.now()}`,
          author: 'PokéCard Flagship',
          handle: '@pokecard_shop',
          isShop: true,
          text: `Mình gửi đề nghị chốt nhanh $${proposed.toLocaleString()} (Tỉ lệ đậu ~${Math.round(successProb * 100)}%) được không bác?`,
          time: 'Vừa xong',
        },
        {
          id: `oh_s_${Date.now() + 1}`,
          author: item.sellerName,
          handle: toHandle(item.sellerName),
          text: replyMsg,
          time: 'Vừa xong',
        },
      ],
    }));
  };

  const handleBuyOverpriced = (item: OverpricedListingItem) => {
    if (item.status !== 'active' || shopState.cash < item.askingPrice) return;
    soundManager.playCashRegister();
    onBuyOverpricedCard?.(item.card, item.askingPrice, item.sellerName);
    setOverpricedOverrides((prev) => ({
      ...prev,
      [item.id]: { ...item, status: 'sold' },
    }));
  };

  const handleSendManualReply = (postId: string, authorName: string, extraContext: string) => {
    const draft = (replyDrafts[postId] || '').trim();
    if (!draft) return;
    soundManager.playSelectSound();
    setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
    setOpenThreadIds((prev) => ({ ...prev, [postId]: true }));

    setThreadComments((prev) => ({
      ...prev,
      [postId]: [
        ...(prev[postId] || []),
        {
          id: `u_${Date.now()}`,
          author: 'PokéCard Flagship',
          handle: '@pokecard_shop',
          isShop: true,
          text: draft,
          time: 'Vừa xong',
        },
        {
          id: `s_${Date.now() + 1}`,
          author: authorName,
          handle: toHandle(authorName),
          text: extraContext,
          time: 'Vừa xong',
        },
      ],
    }));
  };

  const handleCreatePlayerPost = () => {
    if (!selectedCardId) return;
    const found = ownedBinderCards.find((e) => e.card.id === selectedCardId);
    if (!found) return;
    soundManager.playSelectSound();

    const market = Math.max(2, Math.round(found.card.marketPrice || 15));
    const ask = Math.max(2, Math.round(market * 1.08));
    const buyerNames = ['Minh Collector Q1', 'Hùng PokéFan', 'Linh Grand Line', 'Tuấn Hải Tặc VIP', 'Khang Hunter'];
    const buyerOfferName = buyerNames[Math.floor(Math.random() * buyerNames.length)];
    const offerFactor = 0.94 + Math.random() * 0.18;
    const buyerOfferPrice = Math.max(2, Math.round(market * offerFactor));

    const newPost: PlayerSocialListing = {
      id: `p_${Date.now()}`,
      card: found.card,
      askingPrice: ask,
      caption:
        customCaption.trim() ||
        `Thanh lý nhanh ${found.card.name} (${found.card.rarity}) chính hãng từ Sổ Thẻ PokéCard Flagship. Ai chốt sớm gả luôn giá tốt!`,
      createdAtLabel: 'Vừa đăng',
      buyerOfferName,
      buyerOfferPrice,
      status: 'open',
    };

    setPlayerListings((prev) => [newPost, ...prev]);
    setCustomCaption('');
    setSelectedCardId('');
    setShowComposerPicker(false);
    setFeedTab('for_you');
  };

  const handleAcceptPlayerOffer = (listing: PlayerSocialListing) => {
    if (listing.status === 'sold' || !onSellBinderCard) return;
    soundManager.playCashRegister();
    onSellBinderCard(listing.card.id, listing.card.name, listing.buyerOfferPrice);
    setPlayerListings((prev) =>
      prev.map((p) => (p.id === listing.id ? { ...p, status: 'sold' } : p))
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#000000] text-zinc-100 rounded-b-2xl overflow-hidden">
      {/* Web App Browser Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#111318] border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playSelectSound();
              onBack();
            }}
            title="Quay lại Tablet Home"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleFreeFeedReload}
            title="Lướt tin mới (F5 Bảng Tin)"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 max-w-lg flex items-center gap-2 bg-[#07090d] px-3 py-1.5 rounded-full border border-zinc-800 text-xs text-zinc-300 font-mono">
          <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
          <span className="truncate">https://cardx.vn/home</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1 text-xs font-black text-emerald-300 font-mono">
            <span>Quỹ: ${shopState.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <button
            onClick={onBack}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer transition"
          >
            Tablet Home
          </button>
        </div>
      </div>

      {/* Main 3-Column X / Threads Social Web App Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-[#000000]">
        {/* Left Navigation Rail */}
        <aside className="hidden md:flex w-48 lg:w-56 flex-col justify-between border-r border-zinc-800/90 p-3 bg-[#050608] shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black font-black text-lg shadow">
                𝕏
              </div>
              <div>
                <div className="text-sm font-black tracking-tight text-white leading-none">CardX</div>
                <div className="text-[10px] font-bold text-zinc-400 mt-0.5">Cộng Đồng & Chợ Thẻ</div>
              </div>
            </div>

            {[
              { id: 'for_you' as const, label: 'Dành cho bạn', icon: <Flame className="h-4 w-4" />, count: resolvedFeedItems.length + pressNewsPosts.length + playerListings.length },
              { id: 'press_news' as const, label: 'Báo Thị Trường', icon: <Newspaper className="h-4 w-4" />, count: pressNewsPosts.length },
              { id: 'sell_listings' as const, label: 'Rao bán thẻ', icon: <ShoppingBag className="h-4 w-4" />, count: sellListingsCount },
              { id: 'community' as const, label: 'Hỏi đáp & Flex', icon: <HelpCircle className="h-4 w-4" />, count: resolvedFeedItems.length - sellListingsCount },
              { id: 'my_shop' as const, label: 'Bài của Shop', icon: <Sparkles className="h-4 w-4" />, count: playerListings.length },
            ].map((nav) => {
              const active = feedTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    soundManager.playSelectSound();
                    setFeedTab(nav.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow'
                      : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {nav.icon}
                    <span>{nav.label}</span>
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-800/80 text-zinc-500'}`}>
                    {nav.count}
                  </span>
                </button>
              );
            })}

            <div className="pt-2 space-y-2">
              <button
                onClick={handleFreeFeedReload}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs py-2 transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Lướt Tin Mới (Free)</span>
              </button>

              {onRefreshMarketPulses && (
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    onRefreshMarketPulses();
                  }}
                  disabled={shopState.cash < 15}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/35 hover:bg-amber-900/45 text-amber-200 font-black text-xs py-2 transition disabled:opacity-40 cursor-pointer"
                >
                  <Newspaper className="h-3.5 w-3.5" />
                  <span>Cập Nhật Báo ($15)</span>
                </button>
              )}

              <button
                onClick={handlePaidRadarScan}
                disabled={shopState.cash < 20}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black text-xs py-2 shadow-lg transition disabled:opacity-40 cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Quét Tin Ngầm ($20)</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/90 bg-zinc-950 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-black font-black text-xs shrink-0">
                PC
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs font-black text-white truncate">
                  <span>PokéCard Shop</span>
                  <BadgeCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                </div>
                <div className="text-[10px] text-zinc-500 truncate">@pokecard_flagship • Lv.{shopState.storeLevel}</div>
              </div>
            </div>
            {assetBuffs.haggleBonusPct > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-[10px] font-bold text-amber-300">
                ✨ Buff Luxury: +{assetBuffs.haggleBonusPct}% Ép Giá
              </div>
            )}
          </div>
        </aside>

        {/* Center Social Feed Stream */}
        <main className="flex-1 min-w-0 overflow-y-auto border-r border-zinc-800/80">
          {/* Sticky Feed Tabs */}
          <div className="sticky top-0 z-20 backdrop-blur-md bg-black/85 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'for_you' as const, label: 'Dành cho bạn' },
                { id: 'press_news' as const, label: `Báo Chí (${pressNewsPosts.length})` },
                { id: 'sell_listings' as const, label: `Rao bán (${sellListingsCount})` },
                { id: 'community' as const, label: 'Hỏi Card & Chat' },
                { id: 'my_shop' as const, label: `Của Shop (${playerListings.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFeedTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition cursor-pointer ${
                    feedTab === t.id
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleFreeFeedReload}
              className="md:hidden flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1.5 text-[11px] font-black text-black cursor-pointer shrink-0"
            >
              <RefreshCw className="h-3 w-3" /> Tin Mới
            </button>
          </div>

          {/* Post Composer */}
          {onSellBinderCard && (
            <div className="border-b border-zinc-800/90 px-4 py-3 bg-[#050608]">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-black font-black text-xs shrink-0">
                  PC
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Đăng bài hỏi giá hoặc rao bán thẻ từ Sổ Thẻ lên CardX..."
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />

                  {showComposerPicker && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 space-y-2">
                      <div className="text-[11px] font-bold text-zinc-400">
                        Chọn thẻ trong Sổ Thẻ ({ownedBinderCards.length} loại đang có):
                      </div>
                      {ownedBinderCards.length === 0 ? (
                        <div className="text-xs text-zinc-500 py-2">
                          Sổ Thẻ chưa có lá bài nào. Hãy mở pack hoặc săn bài trên chợ để đăng bán!
                        </div>
                      ) : (
                        <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                          {ownedBinderCards.slice(0, 24).map(({ card, qty }) => {
                            const selected = selectedCardId === card.id;
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => setSelectedCardId(card.id)}
                                className={`flex items-center gap-2 rounded-lg border p-1.5 text-left cursor-pointer transition ${
                                  selected
                                    ? 'border-sky-400 bg-sky-950/40'
                                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                                }`}
                              >
                                <img src={card.imageUrl} alt={card.name} className="h-9 w-7 rounded object-cover shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-bold text-white truncate">{card.name}</div>
                                  <div className="text-[10px] text-emerald-400 font-mono">
                                    SL: {qty} • TT: ${(card.marketPrice || 10).toLocaleString()}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowComposerPicker((p) => !p)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:border-sky-500/50 px-2.5 py-1 text-[11px] font-bold text-sky-300 cursor-pointer transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>
                        {selectedCardId
                          ? `Đã chọn: ${ALL_CARDS_LOOKUP.get(selectedCardId)?.name || 'Thẻ'}`
                          : 'Chọn Thẻ Từ Sổ Thẻ'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCreatePlayerPost}
                      disabled={!selectedCardId}
                      className="rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-1 text-xs font-black text-black disabled:opacity-35 cursor-pointer transition"
                    >
                      Đăng Bài
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Player's Own Listings */}
          {(feedTab === 'for_you' || feedTab === 'my_shop') &&
            playerListings.map((listing) => (
              <article
                key={listing.id}
                className="border-b border-zinc-800/90 px-4 py-3.5 bg-sky-950/10 hover:bg-zinc-950/80 transition"
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-black font-black text-xs shadow">
                      PC
                    </div>
                    <div className="w-0.5 flex-1 bg-zinc-800 mt-1.5 rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-black text-white">PokéCard Flagship</span>
                        <BadgeCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="text-xs text-zinc-500">@pokecard_shop · {listing.createdAtLabel}</span>
                      </div>
                      <span className="rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-black text-sky-300">
                        BÀI ĐĂNG CỦA SHOP
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                      {listing.caption} <span className="text-sky-400 font-semibold">#CardX #BanThe</span>
                    </p>

                    <div className="rounded-2xl border border-zinc-800 bg-[#0b0e14] p-3 flex items-center gap-3">
                      <img
                        src={listing.card.imageUrl}
                        alt={listing.card.name}
                        className="h-20 w-14 rounded-lg object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-white truncate">{listing.card.name}</div>
                        <div className="text-[11px] text-zinc-400">
                          {listing.card.rarity} • Giá thị trường: ${(listing.card.marketPrice || 10).toLocaleString()}
                        </div>
                        <div className="mt-1.5 text-xs font-black text-emerald-300">
                          Giá Shop Rao: ${listing.askingPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs">
                        <span className="font-black text-amber-300">{listing.buyerOfferName}</span>{' '}
                        <span className="text-zinc-400">trả giá ngay:</span>{' '}
                        <span className="font-black text-emerald-400 font-mono">
                          ${listing.buyerOfferPrice.toLocaleString()}
                        </span>
                      </div>
                      {listing.status === 'sold' ? (
                        <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-[11px] font-black text-emerald-300">
                          ✅ Đã Bán Thành Công
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcceptPlayerOffer(listing)}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-[11px] font-black text-black cursor-pointer transition"
                        >
                          Chốt Bán (+${listing.buyerOfferPrice.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}

          {/* TCG Press / News Outlet Posts (Breaking Market Events) */}
          {(feedTab === 'for_you' || feedTab === 'press_news') && (
            <>
              {feedTab === 'press_news' && (
                <div className="border-b border-zinc-800/90 px-4 py-3 bg-[#090d14] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-zinc-400">
                    Bản tin biến động giá thị trường TCG cập nhật trực tiếp từ các trang báo chuyên ngành.
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenPokeLive && (
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          onOpenPokeLive();
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-500/45 bg-rose-500/15 px-2.5 py-1 text-[11px] font-black text-rose-300 hover:bg-rose-500/25 cursor-pointer"
                      >
                        <Video className="h-3.5 w-3.5" /> Mở PokeLive →
                      </button>
                    )}
                    {onRefreshMarketPulses && (
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          onRefreshMarketPulses();
                        }}
                        disabled={shopState.cash < 15}
                        className="flex items-center gap-1 rounded-lg border border-amber-500/45 bg-amber-950/35 px-2.5 py-1 text-[11px] font-black text-amber-200 hover:bg-amber-900/45 disabled:opacity-40 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" /> Cập Nhật Tin ($15)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {filteredPressPosts.map((post) => {
                const isLiked = !!likedIds[post.id];
                const isReposted = !!repostedIds[post.id];
                const isSaved = !!savedIds[post.id];
                const allComments = [...post.initialComments, ...(threadComments[post.id] || [])];
                const isThreadOpen = !!openThreadIds[post.id] || allComments.length > 0;
                const { pulse } = post;

                return (
                  <article
                    key={post.id}
                    className={`border-b border-zinc-800/90 px-4 py-3.5 transition ${
                      pulse.isBullish
                        ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                        : 'bg-amber-950/10 hover:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md">
                          <Newspaper className="h-5 w-5" />
                        </div>
                        {isThreadOpen && <div className="w-0.5 flex-1 bg-zinc-800 mt-1.5 rounded-full" />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs sm:text-sm font-black text-white truncate">{post.outletName}</span>
                            <BadgeCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="text-[11px] text-zinc-500 truncate">
                              {post.outletHandle} · {post.timeLabel}
                            </span>
                          </div>
                          <span className="rounded-md bg-sky-500/15 border border-sky-500/35 px-2 py-0.5 text-[10px] font-black text-sky-300">
                            {post.categoryLabel}
                          </span>
                        </div>

                        <div
                          className={`rounded-2xl border p-3.5 space-y-2 ${
                            pulse.isBullish
                              ? 'border-emerald-500/40 bg-[#071310]'
                              : 'border-amber-500/40 bg-[#140e06]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                                pulse.isBullish
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {pulse.isBullish ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {pulse.badge}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-zinc-300">
                              Hệ số giá: x{pulse.multiplier.toFixed(2)}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-white leading-snug">
                            {pulse.headline}
                          </h4>

                          <p className="text-xs text-zinc-300 leading-relaxed">
                            💡 <span className="font-bold text-amber-200">Phân tích & Chiến thuật:</span>{' '}
                            {pulse.advice}
                          </p>
                        </div>

                        {/* Engagement Row */}
                        <div className="flex items-center justify-between text-zinc-500 pt-0.5 pr-2">
                          <button
                            onClick={() => setOpenThreadIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="font-mono text-[11px]">{allComments.length}</span>
                          </button>
                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              setRepostedIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                            }}
                            className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isReposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'}`}
                          >
                            <Repeat2 className="h-4 w-4" />
                            <span className="font-mono text-[11px]">{post.baseReposts + (isReposted ? 1 : 0)}</span>
                          </button>
                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              setLikedIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                            }}
                            className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'}`}
                          >
                            <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                            <span className="font-mono text-[11px]">{post.baseLikes + (isLiked ? 1 : 0)}</span>
                          </button>
                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              setSavedIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }));
                            }}
                            className={`flex items-center gap-1 text-xs transition cursor-pointer ${isSaved ? 'text-amber-400' : 'hover:text-amber-300'}`}
                          >
                            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>

                        {isThreadOpen && (
                          <div className="space-y-1.5 pt-1">
                            {allComments.map((c) => (
                              <div key={c.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/90 px-3 py-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-black ${c.isShop ? 'text-amber-300' : 'text-zinc-200'}`}>{c.author}</span>
                                  <span className="text-[10px] text-zinc-500">{c.handle} · {c.time}</span>
                                </div>
                                <p className="text-zinc-300 mt-0.5">{c.text}</p>
                              </div>
                            ))}
                            <div className="flex items-center gap-2 pt-0.5">
                              <input
                                type="text"
                                value={replyDrafts[post.id] || ''}
                                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSendManualReply(post.id, post.outletName, 'Cảm ơn shop đã theo dõi bản tin thị trường! Chúc shop chốt đơn rực rỡ 📈');
                                  }
                                }}
                                placeholder={`Bình luận dưới bài báo ${post.outletName}...`}
                                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                              />
                              <button
                                onClick={() =>
                                  handleSendManualReply(post.id, post.outletName, 'Cảm ơn shop đã theo dõi bản tin thị trường! Chúc shop chốt đơn rực rỡ 📈')
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-black hover:bg-sky-400 cursor-pointer transition"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </>
          )}

          {/* Mixed Social Feed Posts */}
          {filteredItems.map((item, idx) => {
            // -------------------------------------------------------------
            // CASE A: COMMUNITY SOCIAL POST (HỎI CARD / CHECK / KHOE PULL)
            // -------------------------------------------------------------
            if (item.kind === 'community') {
              const handle = toHandle(item.authorName);
              const initials = item.authorName.split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
              const isLiked = !!likedIds[item.id];
              const isReposted = !!repostedIds[item.id];
              const isSaved = !!savedIds[item.id];
              const extraComments = threadComments[item.id] || [];
              const allComments = [...item.initialComments, ...extraComments];
              const isThreadOpen = !!openThreadIds[item.id] || allComments.length > 0;

              return (
                <article key={item.id} className="border-b border-zinc-800/90 px-4 py-3.5 hover:bg-[#080a0f] transition">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(item.authorName)} text-white font-black text-xs`}>
                        {initials}
                      </div>
                      {isThreadOpen && <div className="w-0.5 flex-1 bg-zinc-800 mt-1.5 rounded-full" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs sm:text-sm font-black text-white truncate">{item.authorName}</span>
                          <span className="text-[11px] text-zinc-500 truncate">{handle} · {item.timeLabel}</span>
                        </div>
                        <span className="rounded-md bg-zinc-800/90 border border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                          {item.badgeLabel}
                        </span>
                      </div>

                      <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed">{item.caption}</p>

                      {item.card && (
                        <div className="rounded-2xl border border-zinc-800 bg-[#0b0e14] p-2.5 flex items-center gap-3">
                          <img
                            src={item.card.imageUrl}
                            alt={item.card.name}
                            className="h-20 w-14 rounded-lg object-cover border border-zinc-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">{item.card.name}</div>
                            <div className="text-[11px] text-zinc-400">{item.card.rarity} • Ảnh đính kèm hỏi đáp</div>
                            <div className="text-[10px] text-sky-400 mt-1 font-semibold">
                              💬 Mời cộng đồng góp ý bên dưới
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Social Engagement Row */}
                      <div className="flex items-center justify-between text-zinc-500 pt-0.5 pr-2">
                        <button
                          onClick={() => setOpenThreadIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="font-mono text-[11px]">{allComments.length}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setRepostedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isReposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'}`}
                        >
                          <Repeat2 className="h-4 w-4" />
                          <span className="font-mono text-[11px]">{item.baseReposts + (isReposted ? 1 : 0)}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setLikedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'}`}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                          <span className="font-mono text-[11px]">{item.baseLikes + (isLiked ? 1 : 0)}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setSavedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`flex items-center gap-1 text-xs transition cursor-pointer ${isSaved ? 'text-amber-400' : 'hover:text-amber-300'}`}
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      {isThreadOpen && (
                        <div className="space-y-1.5 pt-1">
                          {allComments.map((c) => (
                            <div key={c.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/90 px-3 py-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black ${c.isShop ? 'text-amber-300' : 'text-zinc-200'}`}>{c.author}</span>
                                <span className="text-[10px] text-zinc-500">{c.handle} · {c.time}</span>
                              </div>
                              <p className="text-zinc-300 mt-0.5">{c.text}</p>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-0.5">
                            <input
                              type="text"
                              value={replyDrafts[item.id] || ''}
                              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendManualReply(item.id, item.authorName, 'Cảm ơn shop PokéCard đã tư vấn nhiệt tình nha! 🙏');
                                }
                              }}
                              placeholder={`Bình luận góp ý cho ${item.authorName}...`}
                              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                            />
                            <button
                              onClick={() =>
                                handleSendManualReply(item.id, item.authorName, 'Cảm ơn shop PokéCard đã tư vấn nhiệt tình nha! 🙏')
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-black hover:bg-sky-400 cursor-pointer transition"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            }

            // -------------------------------------------------------------
            // CASE B: OVERPRICED ("GIÁ TRÊN TRỜI") SELLER LISTING
            // -------------------------------------------------------------
            if (item.kind === 'overpriced') {
              const isClosed = item.status !== 'active';
              const markupPct = Math.round(((item.askingPrice - item.marketValue) / Math.max(1, item.marketValue)) * 100);
              const handle = toHandle(item.sellerName);
              const initials = item.sellerName.split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
              const isLiked = !!likedIds[item.id];
              const isReposted = !!repostedIds[item.id];
              const isSaved = !!savedIds[item.id];
              const allComments = [...item.initialComments, ...(threadComments[item.id] || [])];
              const isThreadOpen = !!openThreadIds[item.id] || allComments.length > 0;
              const patienceColor =
                item.sellerPatience >= 65 ? 'bg-emerald-500' : item.sellerPatience >= 35 ? 'bg-amber-500' : 'bg-rose-500';

              return (
                <article
                  key={item.id}
                  className={`border-b border-zinc-800/90 px-4 py-3.5 transition ${isClosed ? 'bg-zinc-950/60 opacity-70' : 'hover:bg-[#080a0f]'}`}
                >
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(item.sellerName)} text-white font-black text-xs`}>
                        {initials}
                      </div>
                      {isThreadOpen && <div className="w-0.5 flex-1 bg-zinc-800 mt-1.5 rounded-full" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs sm:text-sm font-black text-white truncate">{item.sellerName}</span>
                          <span className="text-[11px] text-zinc-500 truncate">{handle} · {item.timeLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/90 border border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                            <MapPin className="h-2.5 w-2.5" /> {item.locationName}
                          </span>
                          <span className="rounded-md bg-rose-500/15 border border-rose-500/35 px-2 py-0.5 text-[10px] font-black text-rose-300">
                            {markupPct >= 0 ? `Cao +${markupPct}%` : `Rẻ ${markupPct}%`}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed">{item.caption}</p>

                      <div className="rounded-2xl border border-zinc-800 bg-[#0b0e14] p-3 space-y-2.5">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={item.card.imageUrl}
                            alt={item.card.name}
                            className="h-24 w-17 rounded-xl object-cover border border-zinc-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <div className="text-sm font-black text-white truncate">{item.card.name}</div>
                              <div className="text-[11px] text-zinc-400">{item.card.rarity} • Hàng sưu tầm cá nhân</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/50 border border-zinc-800/80 px-3 py-2">
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold">Giá Thị Trường</div>
                                <div className="text-xs font-bold text-zinc-300 font-mono">
                                  ${item.marketValue.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-rose-400 font-bold">Giá Người Bán Rao</div>
                                <div className="text-base font-black text-rose-300 font-mono">
                                  ${item.askingPrice.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-400">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="whitespace-nowrap">Kiên nhẫn người bán: {item.sellerPatience}%</span>
                            <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-zinc-800 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-300 ${patienceColor}`} style={{ width: `${item.sellerPatience}%` }} />
                            </div>
                          </div>
                          <span className="font-mono font-bold text-zinc-300">Ép giá: {item.haggledCount}/{item.maxHaggles}</span>
                        </div>

                        {isClosed ? (
                          <div className="rounded-xl bg-zinc-900 border border-zinc-800 py-2 text-center text-xs font-black text-zinc-400">
                            {item.status === 'sold' ? '✅ Đã Mua Vào Sổ Thẻ' : '💢 Người Bán Đã Rời Đi'}
                          </div>
                        ) : (() => {
                          const minOffer = Math.max(1, Math.round(item.marketValue * 0.8));
                          const offerVal = Math.max(
                            minOffer,
                            Math.min(item.askingPrice, overpricedOfferDrafts[item.id] ?? item.marketValue)
                          );
                          const probPct = Math.round(getOverpricedOfferSuccessProb(offerVal, item.marketValue, item.askingPrice) * 100);
                          const diffVsMarketPct = Math.round(((offerVal - item.marketValue) / Math.max(1, item.marketValue)) * 100);
                          const probColor =
                            probPct >= 25 ? 'text-emerald-300' : probPct >= 15 ? 'text-amber-300' : 'text-rose-300';
                          const presets = [
                            { label: 'Lỗ -20%', price: Math.max(1, Math.round(item.marketValue * 0.8)) },
                            { label: 'Lỗ -10%', price: Math.max(1, Math.round(item.marketValue * 0.9)) },
                            { label: 'Giá TT', price: item.marketValue },
                            { label: '-15% Rao', price: Math.max(item.marketValue, Math.round(item.askingPrice * 0.85)) },
                          ];
                          return (
                            <div className="space-y-2">
                              <div className="rounded-xl border border-zinc-800/90 bg-black/45 p-2.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                  <span className="font-bold text-zinc-300">
                                    Trả giá:{' '}
                                    <span className="font-mono font-black text-amber-300">${offerVal.toLocaleString()}</span>{' '}
                                    <span className="text-zinc-500">
                                      ({diffVsMarketPct === 0 ? 'Bằng TT' : diffVsMarketPct > 0 ? `+${diffVsMarketPct}% TT` : `${diffVsMarketPct}% TT`})
                                    </span>
                                  </span>
                                  <span className={`font-black ${probColor}`}>
                                    Tỉ lệ đồng ý: {probPct}%
                                  </span>
                                </div>

                                <input
                                  type="range"
                                  min={minOffer}
                                  max={item.askingPrice}
                                  value={offerVal}
                                  onChange={(e) =>
                                    setOverpricedOfferDrafts((prev) => ({
                                      ...prev,
                                      [item.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full accent-amber-400 cursor-pointer h-1.5"
                                />

                                <div className="flex flex-wrap gap-1.5">
                                  {presets.map((p) => {
                                    const pProb = Math.round(getOverpricedOfferSuccessProb(p.price, item.marketValue, item.askingPrice) * 100);
                                    const selected = offerVal === p.price;
                                    return (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() =>
                                          setOverpricedOfferDrafts((prev) => ({ ...prev, [item.id]: p.price }))
                                        }
                                        className={`rounded-lg border px-2 py-1 text-[10px] font-bold cursor-pointer transition ${
                                          selected
                                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                                        }`}
                                      >
                                        {p.label} (${p.price}) · {pProb}%
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleHaggleOverpriced(item, offerVal)}
                                  disabled={item.haggledCount >= item.maxHaggles}
                                  className="flex-1 min-w-[145px] flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/45 bg-amber-950/40 py-2 px-3 text-xs font-black text-amber-200 hover:bg-amber-900/50 disabled:opacity-40 cursor-pointer transition"
                                >
                                  <Handshake className="h-3.5 w-3.5" /> Trả ${offerVal.toLocaleString()} ({probPct}%)
                                </button>
                                <button
                                  onClick={() => handleBuyOverpriced(item)}
                                  disabled={shopState.cash < item.askingPrice || !onBuyOverpricedCard}
                                  className={`flex-[1.3] min-w-[155px] rounded-xl py-2 px-3 text-xs font-black disabled:opacity-40 cursor-pointer transition ${
                                    item.askingPrice <= item.marketValue
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow hover:brightness-110'
                                      : 'border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                  }`}
                                >
                                  {item.askingPrice <= item.marketValue
                                    ? `Chốt Mua Kèo Thơm ($${item.askingPrice.toLocaleString()})`
                                    : `Chốt Mua Giá Cao ($${item.askingPrice.toLocaleString()})`}
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex items-center justify-between text-zinc-500 pt-0.5 pr-2">
                        <button
                          onClick={() => setOpenThreadIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="font-mono text-[11px]">{allComments.length}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setRepostedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isReposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'}`}
                        >
                          <Repeat2 className="h-4 w-4" />
                          <span className="font-mono text-[11px]">{2 + (idx % 6) + (isReposted ? 1 : 0)}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setLikedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'}`}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                          <span className="font-mono text-[11px]">{5 + (idx % 11) + (isLiked ? 1 : 0)}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundManager.playSelectSound();
                            setSavedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          className={`flex items-center gap-1 text-xs transition cursor-pointer ${isSaved ? 'text-amber-400' : 'hover:text-amber-300'}`}
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      {isThreadOpen && (
                        <div className="space-y-1.5 pt-1">
                          {allComments.map((c) => (
                            <div key={c.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/90 px-3 py-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black ${c.isShop ? 'text-amber-300' : 'text-zinc-200'}`}>{c.author}</span>
                                <span className="text-[10px] text-zinc-500">{c.handle} · {c.time}</span>
                              </div>
                              <p className="text-zinc-300 mt-0.5">{c.text}</p>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-0.5">
                            <input
                              type="text"
                              value={replyDrafts[item.id] || ''}
                              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendManualReply(item.id, item.sellerName, 'Hàng đẹp giá kỷ niệm, thuận mua vừa bán nha bác ơi!');
                                }
                              }}
                              placeholder={`Bình luận hỏi ${item.sellerName}...`}
                              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                            />
                            <button
                              onClick={() =>
                                handleSendManualReply(item.id, item.sellerName, 'Hàng đẹp giá kỷ niệm, thuận mua vừa bán nha bác ơi!')
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-black hover:bg-sky-400 cursor-pointer transition"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            }

            // -------------------------------------------------------------
            // CASE C: RARE 2–5% CHEAP STEAL DEAL (CITYHUNT MECHANICS)
            // -------------------------------------------------------------
            const spot = huntSpotMap.get(item.spotId);
            if (!spot) return null;
            const isClosed = spot.status !== 'active';
            const discountVsMarket = Math.round(((spot.marketValue - spot.askingPrice) / Math.max(1, spot.marketValue)) * 100);
            const handle = toHandle(spot.sellerName);
            const initials = spot.sellerName.split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
            const isLiked = !!likedIds[spot.id];
            const isReposted = !!repostedIds[spot.id];
            const isSaved = !!savedIds[spot.id];
            const comments = threadComments[spot.id] || [];
            const isThreadOpen = !!openThreadIds[spot.id] || comments.length > 0;
            const patienceColor =
              spot.sellerPatience >= 65 ? 'bg-emerald-500' : spot.sellerPatience >= 35 ? 'bg-amber-500' : 'bg-rose-500';

            return (
              <article
                key={spot.id}
                className={`border-b border-zinc-800/90 px-4 py-3.5 transition ${
                  isClosed ? 'bg-zinc-950/60 opacity-70' : 'bg-emerald-950/10 hover:bg-emerald-950/20'
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(spot.sellerName)} text-white font-black text-xs shadow-md`}>
                      {initials}
                    </div>
                    {isThreadOpen && <div className="w-0.5 flex-1 bg-zinc-800 mt-1.5 rounded-full" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-black text-white truncate">{spot.sellerName}</span>
                        <BadgeCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span className="text-[11px] text-zinc-500 truncate">{handle} · {item.timeLabel}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-black text-sky-300">
                          <MapPin className="h-2.5 w-2.5" /> {spot.locationName}
                        </span>
                        <span className="rounded-md bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                          Rẻ -{discountVsMarket}%
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed">
                      {spot.storyText}{' '}
                      <span className="text-sky-400 font-semibold">
                        #PassGap #{spot.card.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'RareCard'}
                      </span>
                    </p>

                    <div className="rounded-2xl border border-emerald-500/35 bg-[#0b0e14] overflow-hidden p-3 space-y-3">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={spot.card.imageUrl}
                          alt={spot.card.name}
                          className="h-24 w-17 rounded-xl object-cover border border-zinc-700 shadow-lg shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="text-sm font-black text-white truncate">{spot.card.name}</div>
                            <div className="text-[11px] text-zinc-400">{spot.card.rarity} • Kèo hiếm dưới giá thị trường</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/50 border border-zinc-800/80 px-3 py-2">
                            <div>
                              <div className="text-[10px] text-zinc-500 font-bold">Giá Thị Trường</div>
                              <div className="text-xs font-bold text-zinc-400 line-through font-mono">
                                ${spot.marketValue.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-400 font-bold">Giá Đang Rao</div>
                              <div className="text-base font-black text-emerald-300 font-mono">
                                ${spot.askingPrice.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-400 pt-0.5">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="whitespace-nowrap">Kiên nhẫn người bán: {spot.sellerPatience}%</span>
                          <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-zinc-800 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${patienceColor}`} style={{ width: `${Math.max(0, Math.min(100, spot.sellerPatience))}%` }} />
                          </div>
                        </div>
                        <span className="font-mono font-bold text-zinc-300">Ép giá: {spot.haggledCount}/{spot.maxHaggles}</span>
                      </div>

                      {isClosed ? (
                        <div className="rounded-xl bg-zinc-900 border border-zinc-800 py-2 text-center text-xs font-black text-zinc-400">
                          {spot.status === 'sold' ? '✅ Đã Săn Thành Công (Đã cất vào Sổ Thẻ)' : '💢 Người Bán Đã Rời Đi'}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleHaggleCheapDeal(spot)}
                            disabled={spot.haggledCount >= spot.maxHaggles}
                            className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/45 bg-amber-950/40 py-2 px-3 text-xs font-black text-amber-200 hover:bg-amber-900/50 disabled:opacity-40 cursor-pointer transition"
                          >
                            <Handshake className="h-3.5 w-3.5" /> Trả -12%
                          </button>
                          <button
                            onClick={() => {
                              soundManager.playSelectSound();
                              onNavigateToPoi(spot.poiId, spot.locationName, spot.x, spot.z);
                            }}
                            className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/45 bg-sky-950/40 py-2 px-3 text-xs font-black text-sky-200 hover:bg-sky-900/50 cursor-pointer transition"
                          >
                            <Compass className="h-3.5 w-3.5" /> Đặt GPS
                          </button>
                          <button
                            onClick={() => {
                              soundManager.playCashRegister();
                              onBuyCityHunt(spot.id);
                            }}
                            disabled={shopState.cash < spot.askingPrice}
                            className="w-full sm:w-auto sm:flex-[1.5] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2 px-4 text-xs font-black text-black shadow hover:brightness-110 disabled:opacity-40 cursor-pointer transition"
                          >
                            Chốt Mua Vào Kho (${spot.askingPrice.toLocaleString()})
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-zinc-500 pt-0.5 pr-2">
                      <button
                        onClick={() => setOpenThreadIds((prev) => ({ ...prev, [spot.id]: !prev[spot.id] }))}
                        className="flex items-center gap-1.5 text-xs hover:text-sky-400 transition cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="font-mono text-[11px]">{comments.length}</span>
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setRepostedIds((prev) => ({ ...prev, [spot.id]: !prev[spot.id] }));
                        }}
                        className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isReposted ? 'text-emerald-400 font-bold' : 'hover:text-emerald-400'}`}
                      >
                        <Repeat2 className="h-4 w-4" />
                        <span className="font-mono text-[11px]">{4 + (idx % 7) + (isReposted ? 1 : 0)}</span>
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setLikedIds((prev) => ({ ...prev, [spot.id]: !prev[spot.id] }));
                        }}
                        className={`flex items-center gap-1.5 text-xs transition cursor-pointer ${isLiked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'}`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500' : ''}`} />
                        <span className="font-mono text-[11px]">{24 + (idx % 20) + (isLiked ? 1 : 0)}</span>
                      </button>
                      <button
                        onClick={() => {
                          soundManager.playSelectSound();
                          setSavedIds((prev) => ({ ...prev, [spot.id]: !prev[spot.id] }));
                        }}
                        className={`flex items-center gap-1 text-xs transition cursor-pointer ${isSaved ? 'text-amber-400' : 'hover:text-amber-300'}`}
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {isThreadOpen && (
                      <div className="space-y-2 pt-1">
                        {comments.map((c) => (
                          <div key={c.id} className="rounded-xl border border-zinc-800/80 bg-zinc-950/90 px-3 py-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-black ${c.isShop ? 'text-amber-300' : 'text-white'}`}>{c.author}</span>
                              <span className="text-[10px] text-zinc-500">{c.handle} · {c.time}</span>
                            </div>
                            <p className="text-zinc-300 mt-0.5">{c.text}</p>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={replyDrafts[spot.id] || ''}
                            onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [spot.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSendManualReply(
                                  spot.id,
                                  spot.sellerName,
                                  `Mình đang ở ${spot.locationName}, giá $${spot.askingPrice.toLocaleString()} quá hời rồi bác bấm Chốt Mua hoặc Trả -12% nhé!`
                                );
                              }
                            }}
                            placeholder={`Nhắn hỏi ${spot.sellerName}...`}
                            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            onClick={() =>
                              handleSendManualReply(
                                spot.id,
                                spot.sellerName,
                                `Mình đang ở ${spot.locationName}, giá $${spot.askingPrice.toLocaleString()} quá hời rồi bác bấm Chốt Mua hoặc Trả -12% nhé!`
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-black hover:bg-sky-400 cursor-pointer transition"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </main>

        {/* Right Discovery & Trends Sidebar */}
        <aside className="hidden lg:flex w-64 xl:w-72 flex-col gap-3 p-3.5 bg-[#050608] overflow-y-auto shrink-0">
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thẻ, câu hỏi, khu vực..."
              className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-3.5 space-y-2">
            <div className="text-xs font-black uppercase text-amber-300">
              Nhịp Sống Chợ Mạng CardX
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Phần lớn bài đăng là hỏi giá, check real/fake và rao giá cao hơn thị trường. Chỉ khoảng <strong className="text-emerald-300">2%–5%</strong> là kèo bán gấp giá rẻ thực sự!
            </p>
            <div className="flex items-center justify-between text-[11px] font-bold pt-1">
              <span className={activeCheapDealCount > 0 ? 'text-emerald-300' : 'text-zinc-400'}>
                {activeCheapDealCount > 0 ? `🎯 Có ${activeCheapDealCount} kèo giá rẻ trong luồng` : '🔍 Chưa thấy kèo giá rẻ (lướt thêm)'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-[#0b0e14] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-white">
                <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                <span>Báo Chí Thị Trường</span>
              </div>
              {onRefreshMarketPulses && (
                <button
                  onClick={() => {
                    soundManager.playSelectSound();
                    onRefreshMarketPulses();
                  }}
                  disabled={shopState.cash < 15}
                  className="text-[10px] font-black text-amber-300 hover:text-amber-200 disabled:opacity-40 cursor-pointer"
                >
                  Đổi tin ($15)
                </button>
              )}
            </div>

            {pulses.slice(0, 2).map((pulse) => (
              <div
                key={pulse.id}
                onClick={() => setFeedTab('press_news')}
                className="rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-sky-500/40 p-2.5 space-y-1 cursor-pointer transition"
              >
                <div className="flex items-center justify-between text-[10px] font-black">
                  <span className={pulse.isBullish ? 'text-emerald-400' : 'text-amber-400'}>{pulse.badge}</span>
                  <span className="text-zinc-500">x{pulse.multiplier.toFixed(2)}</span>
                </div>
                <div className="text-[11px] font-bold text-zinc-200 leading-snug">{pulse.headline}</div>
              </div>
            ))}

            {onOpenPokeLive && (
              <button
                onClick={() => {
                  soundManager.playSelectSound();
                  onOpenPokeLive();
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 py-1.5 text-[11px] font-black text-rose-300 hover:bg-rose-500/25 cursor-pointer transition"
              >
                <Video className="h-3.5 w-3.5" /> Mở PokeLive Studio →
              </button>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Hỏi Giá', 'Check', 'AEON', 'Katinat', 'Sun Wheel', 'Casa Riva'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSearchQuery((prev) => (prev === loc ? '' : loc))}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-bold cursor-pointer transition ${
                    searchQuery === loc
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  #{loc.replace(/\s+/g, '')}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
