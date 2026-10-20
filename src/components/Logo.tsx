interface LogoProps {
  small?: boolean;
}

const BLUE = 'var(--color-brand-primary)';
const ORANGE = 'var(--color-brand-accent)';

export default function Logo({ small = false }: LogoProps) {
  const brandFontSize = small ? '25px' : '40px';
  const subtitleFontSize = small ? '8px' : '16px';

  return (
    <button
      className="m-[5px_15px] cursor-pointer border-0 bg-transparent p-0"
      onClick={() => {
        /* Handle navigation here */
      }}
      suppressHydrationWarning={true}
      type="button"
    >
      <div className="my-[10px] flex w-full flex-col items-center justify-center" suppressHydrationWarning={true}>
        <div className="flex font-bold" suppressHydrationWarning={true}>
          <span style={{ color: BLUE, fontSize: brandFontSize, fontWeight: 'bold' }} suppressHydrationWarning={true}>
            GOLO
          </span>
          <span style={{ color: ORANGE, fontSize: brandFontSize, fontWeight: 'bold' }} suppressHydrationWarning={true}>
            ZUR
          </span>
        </div>
        <div className="-mt-[5px] flex font-bold" suppressHydrationWarning={true}>
          <span style={{ color: BLUE, fontSize: subtitleFontSize, fontWeight: 'bold' }} suppressHydrationWarning={true}>
            DISTRI
          </span>
          <span style={{ color: ORANGE, fontSize: subtitleFontSize, fontWeight: 'bold' }} suppressHydrationWarning={true}>
            BUIDORA
          </span>
        </div>
      </div>
    </button>
  );
}
