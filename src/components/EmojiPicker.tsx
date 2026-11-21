import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';

const CATEGORIES = [
  { id: 'smileys', label: 'Smileys', icon: '😀', emojis: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🤫 🤥 😶 😶‍🌫️ 😐 😑 😬 🫠 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠'.split(' ') },
  { id: 'gestures', label: 'Gestures', icon: '👋', emojis: '👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶'.split(' ') },
  { id: 'hearts', label: 'Hearts', icon: '❤️', emojis: '❤️ 🧡 💛 💚 💙 💜 🖤 🩶 🤍 🤎 🩷 🩵 🩶 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟'.split(' ') },
  { id: 'animals', label: 'Animals', icon: '🐻', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🦭 🦦 🦥 🐘 🦣 🦏 🦛 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🪿 🕊️ 🐇 🦝 🦨 🦡 🦫 🦔'.split(' ') },
  { id: 'nature', label: 'Nature', icon: '🌸', emojis: '🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🍄 🌾 💐 🌷 🪷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌪️ 🌈 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 ☔ 🌊'.split(' ') },
  { id: 'food', label: 'Food', icon: '🍕', emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🍄 🥜 🫘 🌰 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🧊'.split(' ') },
  { id: 'activities', label: 'Activities', icon: '⚽', emojis: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚴 🚵 🎯 🪂 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎮 🕹️ 🧩'.split(' ') },
  { id: 'travel', label: 'Travel', icon: '🚀', emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🛟 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 🏖️ 🏝️ 🏜️ 🏕️ ⛺ 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏛️ ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 🌌'.split(' ') },
  { id: 'objects', label: 'Objects', icon: '💡', emojis: '⌚ 📱 📲 💻 🖥️ 🖨️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🎥 🎞️ 📽️ 🎬 📺 📷 📸 📹 📼 🔍 🔎 🕯️ 💡 🔦 🏮 🪔 📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📄 📰 🗞️ 📑 🔖 🏷️ 💰 🪙 💴 💵 💶 💷 💸 💳 🧾 💹 ✉️ 📧 📨 📩 📤 📥 📦 📫 📪 📬 📭 📮 🗳️ ✏️ ✒️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 💼 📁 📂 🗂️ 📅 📆 🗒️ 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 ✂️ 🗃️ 🗄️ 🗑️ 🔒 🔓 🔏 🔐 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️ 🗡️ ⚔️ 💣 🪃 🏹 🛡️ 🔧 🪛 🔩 ⚙️ 🗜️ ⚖️ 🦯 🔗 ⛓️ 🧰 🧲 🪜 🧪 🧫 🧬 🔬 🔭 📡 💉 🩸 💊 🩹 🩺 🚪 🛏️ 🛋️ 🪑 🚽 🚿 🛁 🪥 🪒 🧴 🧻 🧼 🫧 🧽 🧹 🧺 🧯 🛒'.split(' ') },
  { id: 'symbols', label: 'Symbols', icon: '💯', emojis: '💯 🔢 🔣 🔤 🔡 🔠 🅰️ 🆎 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 Ⓜ️ 🆕 🆖 🅾️ 🆗 🆘 🆙 🆚 🈁 🈂️ 🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🉑 🈸 🈴 🈳 ㊗️ ㊙️ 🈺 🈵 ▪️ ▫️ ◻️ ◼️ ◽ ◾ ⬛ ⬜ 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲 🟣 🟪 🟦 🟩 🟨 🟧 🟥 🟫 ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ✖️ 💲 💱 ©️ ®️ ™️ 🔔 🔕 📣 📢 💬 💭 🗯️ ♠️ ♥️ ♦️ ♣️ 🃏 🀄 🎴'.split(' ') },
  { id: 'flags', label: 'Flags', icon: '🏳️', emojis: '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇳🇬 🇬🇭 🇰🇪 🇿🇦 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇳🇿 🇮🇪 🇫🇷 🇩🇪 🇪🇸 🇮🇹 🇵🇹 🇳🇱 🇧🇪 🇨🇭 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇮🇸 🇵🇱 🇺🇦 🇷🇺 🇹🇷 🇬🇷 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇵🇰 🇧🇩 🇸🇬 🇲🇾 🇮🇩 🇵🇭 🇹🇭 🇻🇳 🇧🇷 🇦🇷 🇲🇽 🇨🇴 🇨🇱 🇪🇬 🇲🇦 🇸🇦 🇦🇪 🇶🇦 🇯🇲 🇹🇹'.split(' ') },
];

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onSelectSticker?: (sticker: { id: string; emoji: string; label: string }) => void;
}

const STICKERS = [
  { id: 'big-love', emoji: '🥰', label: 'Big love' }, { id: 'nexora-heart', emoji: '💜', label: 'Nexora love' },
  { id: 'celebrate', emoji: '🥳', label: 'Celebrate' }, { id: 'fire', emoji: '🔥', label: 'On fire' },
  { id: 'respect', emoji: '🫡', label: 'Respect' }, { id: 'laugh', emoji: '🤣', label: 'I am dead' },
  { id: 'hug', emoji: '🤗', label: 'Sending hugs' }, { id: 'thanks', emoji: '🙏', label: 'Thank you' },
  { id: 'wow', emoji: '🤯', label: 'Mind blown' }, { id: 'sad', emoji: '🥹', label: 'Emotional' },
  { id: 'cool', emoji: '😎', label: 'Too cool' }, { id: 'queen', emoji: '👑', label: 'Royalty' },
  { id: 'party', emoji: '🎉', label: 'Party time' }, { id: 'clap', emoji: '👏', label: 'Well done' },
  { id: 'kiss', emoji: '😘', label: 'Kisses' }, { id: 'peace', emoji: '✌️', label: 'Peace' },
  { id: 'strong', emoji: '💪', label: 'Stay strong' }, { id: 'goodnight', emoji: '🌙', label: 'Good night' },
  { id: 'sorry', emoji: '🥺', label: 'Please' }, { id: 'winner', emoji: '🏆', label: 'Winner' },
];

export default function EmojiPicker({ isOpen, onClose, onSelect, onSelectSticker }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'emoji' | 'stickers'>('emoji');
  const [activeCategory, setActiveCategory] = useState('smileys');

  const visibleEmojis = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    const source = term
      ? CATEGORIES.filter(category => category.label.toLocaleLowerCase().includes(term) || category.id.includes(term)).flatMap(category => category.emojis)
      : CATEGORIES.find(category => category.id === activeCategory)?.emojis || CATEGORIES[0].emojis;
    return [...new Set(source)];
  }, [searchTerm, activeCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close emoji picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default"
          />
          <motion.section
            role="dialog"
            aria-label="Emoji picker"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex h-[min(48vh,420px)] flex-col rounded-t-3xl border-t border-white/10 bg-[#09071c] p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-violet-950/20 p-2.5">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                type="search"
                placeholder="Search emoji categories..."
                aria-label="Search emoji categories"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear search" className="text-xs text-violet-300">Clear</button>}
              <button type="button" onClick={onClose} aria-label="Close emoji picker" className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            <div className="mb-3 flex gap-2" role="tablist" aria-label="Emoji and sticker collections">
              <button type="button" role="tab" aria-selected={activeTab === 'emoji'} onClick={() => { setActiveTab('emoji'); setSearchTerm(''); }} className={`min-h-10 rounded-xl px-4 text-xs font-semibold ${activeTab === 'emoji' ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-400'}`}>Emoji</button>
              <button type="button" role="tab" aria-selected={activeTab === 'stickers'} onClick={() => { setActiveTab('stickers'); setSearchTerm(''); }} className={`min-h-10 rounded-xl px-4 text-xs font-semibold ${activeTab === 'stickers' ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-400'}`}>Stickers</button>
            </div>
            {activeTab === 'emoji' && <div className="mb-3 flex gap-1.5 overflow-x-auto pb-2" role="tablist" aria-label="Emoji categories">
              {CATEGORIES.map(category => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category.id && !searchTerm}
                  onClick={() => { setActiveCategory(category.id); setSearchTerm(''); }}
                  title={category.label}
                  className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs transition-colors ${activeCategory === category.id && !searchTerm ? 'bg-violet-600/30 text-violet-100' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="text-lg">{category.icon}</span><span>{category.label}</span>
                </button>
              ))}
            </div>}

            {activeTab === 'emoji' ? <div className="grid flex-1 grid-cols-8 content-start gap-1 overflow-y-auto overscroll-contain" role="grid" aria-label="Available emojis">
              {visibleEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => { onSelect(emoji); }}
                  aria-label={`Insert ${emoji}`}
                  className="flex aspect-square items-center justify-center rounded-xl text-[26px] transition hover:scale-110 hover:bg-violet-600/20 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
              {visibleEmojis.length === 0 && <p className="col-span-8 py-8 text-center text-xs text-zinc-500">No emojis found in this category.</p>}
            </div> : <div className="grid flex-1 grid-cols-4 content-start gap-2 overflow-y-auto overscroll-contain" role="grid" aria-label="NEXORA stickers">
              {STICKERS.filter(sticker => !searchTerm || sticker.label.toLowerCase().includes(searchTerm.toLowerCase()) || sticker.emoji.includes(searchTerm)).map(sticker => (
                <button key={sticker.id} type="button" onClick={() => { onSelectSticker?.(sticker); onClose(); }} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-violet-300/10 bg-gradient-to-br from-violet-500/15 to-indigo-950/40 p-2 transition hover:border-violet-300/30 hover:bg-violet-500/20">
                  <span className="text-4xl drop-shadow-lg">{sticker.emoji}</span><span className="text-[10px] text-zinc-300">{sticker.label}</span>
                </button>
              ))}
            </div>}
            <p className="pt-2 text-center text-[10px] text-zinc-500">{activeTab === 'emoji' ? `${visibleEmojis.length} emojis · Search by category or browse below` : `${STICKERS.length} NEXORA stickers`}</p>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
