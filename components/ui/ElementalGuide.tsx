import { ELEMENT_ICONS, ELEMENT_WEAKNESS, Element } from '@/lib/gameData';
import { Modal } from './Modal';

interface ElementalGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const ELEMENTS: Element[] = ['Fire', 'Water', 'Earth', 'Thunder', 'Light', 'Dark'];

function getRelationClass(multiplier: number): string {
  if (multiplier > 1) return 'text-emerald-400';
  if (multiplier < 1) return 'text-red-400';
  return 'text-zinc-400';
}

export function ElementalGuide({ isOpen, onClose }: ElementalGuideProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Element Guide" size="lg">
      <div className="space-y-4">
        <p className="text-xs text-zinc-400">
          Attacker vs Defender. Use this chart to pick favorable matchups.
        </p>

        <div className="grid grid-cols-7 gap-1 text-[10px]">
          <div className="p-2 rounded bg-zinc-800 text-zinc-300 font-bold text-center">ATK\DEF</div>
          {ELEMENTS.map(element => (
            <div key={`def-${element}`} className="p-2 rounded bg-zinc-800 text-zinc-200 font-bold text-center">
              {ELEMENT_ICONS[element]}
            </div>
          ))}

          {ELEMENTS.map(attacker => (
            <div key={`row-${attacker}`} className="contents">
              <div key={`atk-${attacker}`} className="p-2 rounded bg-zinc-800 text-zinc-200 font-bold text-center">
                {ELEMENT_ICONS[attacker]}
              </div>
              {ELEMENTS.map(defender => {
                const multiplier = ELEMENT_WEAKNESS[attacker]?.[defender] ?? 1;
                const relationClass = getRelationClass(multiplier);
                return (
                  <div
                    key={`${attacker}-${defender}`}
                    className="p-1 rounded bg-zinc-900 border border-zinc-800 text-center"
                  >
                    <div className={`font-bold ${relationClass}`}>{multiplier.toFixed(1)}x</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
          Tip: prioritize targets where your attacker has <span className="text-emerald-400 font-bold">2.0x</span>{' '}
          and avoid <span className="text-red-400 font-bold">0.5x</span> matchups when possible.
        </div>
      </div>
    </Modal>
  );
}
