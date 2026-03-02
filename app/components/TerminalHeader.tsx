
const stack = [
  "PYTHON",
  "FASTAPI",
  "LIGHTGBM",
  "XGBOOST",
  "QDRANT",
  "GITHUB ACTIONS",
  "DOCKER",
];

export default function TerminalHeader() {
  return (
    <header className="border-4 border-black p-6 md:p-10 mb-8 bg-white">
      {/* Identity */}
      <h1 className="text-6xl md:text-8xl font-black tracking-tighter font-mono uppercase leading-none mb-2">
        SARAL SAINI
      </h1>
      <p className="font-mono text-lg md:text-xl font-bold uppercase tracking-widest border-b-4 border-black pb-4 mb-6">
        AI/ML Systems Engineering Intern
      </p>

      {/* Mission */}
      <p className="font-mono text-base md:text-lg mb-8 border-l-4 border-black pl-4">
        &gt; I build, deploy, and maintain production machine learning systems.
      </p>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-black mb-8">
        <div className="border-b-2 border-r-0 md:border-r-2 border-black p-3 font-mono text-sm">
          <span className="font-black">STATUS:</span> Available for Internship
        </div>
        <div className="border-b-2 border-black p-3 font-mono text-sm">
          <span className="font-black">COHORT:</span> B.Tech CSE, Class of 2028
        </div>
        <div className="border-b-0 border-r-0 md:border-r-2 border-black p-3 font-mono text-sm">
          <span className="font-black">PING:</span> sainisaral659@gmail.com
        </div>
        <div className="p-3 font-mono text-sm">
          <span className="font-black">ENDPOINTS:</span>{" "}
          <a
            href="https://github.com/saralsaini"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            GitHub
          </a>{" "}
          |{" "}
          <a
            href="https://linkedin.com/in/saralsaini"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            LinkedIn
          </a>
        </div>
      </div>

      {/* Stack Marquee */}
      <div className="overflow-hidden border-2 border-black">
        <div className="flex gap-0 animate-marquee whitespace-nowrap">
          {[...stack, ...stack].map((tag, i) => (
            <span
              key={i}
              className="inline-block bg-black text-white font-mono font-bold text-sm px-4 py-2 border-r-2 border-white shrink-0"
            >
              [ {tag} ]
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
