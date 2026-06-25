export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md overflow-hidden">
                <img src="/logo_sin_fondo_learn_hands.png" className="size-8 object-contain" alt="LearnHands" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    LearnHands
                </span>
            </div>
        </>
    );
}
