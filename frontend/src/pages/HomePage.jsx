
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const features = [
  {
    number: '01',
    title: 'Group Management',
    description:
      'Create or join a savings group, view its members and understand your group rules.',
  },
  {
    number: '02',
    title: 'Contribution Tracking',
    description:
      'Review contributions and payment status to help everyone stay informed.',
  },
  {
    number: '03',
    title: 'Payout Scheduling',
    description:
      'Follow the rotation and see which member is next to receive a payout.',
  },
  {
    number: '04',
    title: 'Transparent Records',
    description:
      'Keep contribution and payout records organised throughout each cycle.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create or join a group',
    description:
      'Start a savings circle or join a group with people who share your goals.',
  },
  {
    number: '02',
    title: 'Contribute together',
    description:
      'Follow your group’s contribution amount, payment deadlines and schedule.',
  },
  {
    number: '03',
    title: 'Take your turn',
    description:
      'Follow the agreed payout order and know when your turn is approaching.',
  },
]

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B18B48]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-3xl font-bold tracking-tight text-text sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 leading-7 text-text-muted">
        {description}
      </p>
    </div>
  )
}

export default function HomePage() {
  useEffect(() => {
    const elements = document.querySelectorAll(
      '[data-home-reveal]'
    )

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (reduceMotion) {
      elements.forEach((element) => {
        element.classList.add('home-visible')
      })
      return
    }

    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => {
        element.classList.add('home-visible')
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('home-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -35px 0px',
      }
    )

    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-page text-text transition-colors duration-300">
      <style>{`
        @keyframes homeFadeUp {
          from {
            opacity: 0;
            transform: translateY(26px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes homeFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes homeFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .home-hero-copy {
          animation: homeFadeUp 800ms ease-out both;
        }

        .home-hero-image {
          animation: homeFadeIn 1000ms ease-out both;
          animation-delay: 150ms;
        }

        .home-floating {
          animation: homeFloat 5s ease-in-out infinite;
        }

        [data-home-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 650ms ease,
            transform 650ms ease;
        }

        [data-home-reveal].home-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .home-stagger-1 {
          transition-delay: 80ms;
        }

        .home-stagger-2 {
          transition-delay: 160ms;
        }

        .home-stagger-3 {
          transition-delay: 240ms;
        }

        .home-stagger-4 {
          transition-delay: 320ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .home-hero-copy,
          .home-hero-image,
          .home-floating {
            animation: none !important;
          }

          [data-home-reveal] {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <div className="home-hero-copy">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B18B48]">
              Community savings platform
            </p>

            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Save Together.
              <span className="block text-[#96713D]">
                Achieve More.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-text-muted sm:text-lg">
              Merigo Round helps groups save, track contributions and
              manage merry-go-round payouts with clearer records and
              shared understanding.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-xl bg-[#452044] px-7 py-3.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#351732] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B18B48]"
              >
                Get started
              </Link>

              <a
                href="#how-it-works"
                className="rounded-xl border border-border px-7 py-3.5 text-sm font-bold transition duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B18B48]"
              >
                Learn more
              </a>
            </div>

            <p className="mt-5 text-sm text-text-muted">
              Shared goals. Clear schedules. Stronger communities.
            </p>
          </div>

          {/* Community photograph and savings preview */}
          <div className="home-hero-image relative pb-10 sm:pb-8">
            <div className="home-floating absolute -left-5 top-10 h-28 w-28 rounded-full bg-[#C5A15B]/25" />

            <div className="absolute -right-3 bottom-8 h-32 w-32 rounded-full bg-[#452044]/15" />

            <div className="relative overflow-hidden rounded-[2rem] shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85"
                alt="Friends spending time together as a community"
                fetchPriority="high"
                className="h-[360px] w-full object-cover transition duration-700 hover:scale-[1.025] sm:h-[460px]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#271226]/55 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 text-white sm:bottom-7 sm:left-7">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#F0D9A5]">
                  Better together
                </p>

                <p className="mt-2 max-w-sm text-2xl font-bold leading-snug sm:text-3xl">
                  Every contribution moves the group forward.
                </p>
              </div>
            </div>

            <div className="relative mx-3 -mt-6 rounded-2xl border border-border bg-surface p-5 shadow-lg transition duration-300 hover:shadow-xl sm:mx-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-text-muted">
                    Example savings circle
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    Together We Save
                  </h2>
                </div>

                <span className="rounded-full bg-[#C5A15B]/15 px-3 py-1.5 text-xs font-bold text-[#96713D]">
                  Monthly cycle
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-page p-4 transition duration-300 hover:-translate-y-1">
                  <p className="text-sm text-text-muted">
                    Members
                  </p>

                  <p className="mt-1 text-2xl font-extrabold">
                    12
                  </p>
                </div>

                <div className="rounded-xl bg-page p-4 transition duration-300 hover:-translate-y-1">
                  <p className="text-sm text-text-muted">
                    Contribution
                  </p>

                  <p className="mt-1 text-2xl font-extrabold">
                    KSh 5,000
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="text-sm text-text-muted">
                  Next member in this example round
                </p>

                <p className="mt-1 font-bold">Member 2</p>

                <p className="mt-1 text-xs text-text-muted">
                  Illustrative information, not live group data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="scroll-mt-20 border-y border-border bg-surface/60"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div data-home-reveal>
            <SectionHeading
              eyebrow="Our features"
              title="Everything your savings group needs."
              description="Simple tools for organising members, tracking contributions and following the payout schedule."
            />
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.number}
                data-home-reveal
                className={`rounded-2xl border border-border bg-page p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg home-stagger-${index + 1}`}
              >
                <p className="text-sm font-extrabold tracking-widest text-[#B18B48]">
                  {feature.number}
                </p>

                <h3 className="mt-5 text-lg font-bold">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-text-muted">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto" data-home-reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Three steps towards a shared goal."
              description="Join a group, contribute regularly and follow the agreed payout order."
            />
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.number}
                data-home-reveal
                className={`text-center home-stagger-${index + 1}`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#452044] text-lg font-bold text-white transition duration-300 hover:scale-110 hover:bg-[#351732]">
                  {step.number}
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {step.title}
                </h3>

                <p className="mx-auto mt-3 max-w-sm leading-7 text-text-muted">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Community and trust */}
      <section
        id="about"
        className="scroll-mt-20 bg-[#452044] text-white"
      >
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div
            data-home-reveal
            className="min-h-[320px] overflow-hidden sm:min-h-[400px]"
          >
            <img
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85"
              alt="People connecting and sharing time together"
              loading="lazy"
              className="h-full min-h-[320px] w-full object-cover transition duration-700 hover:scale-[1.025] sm:min-h-[400px]"
            />
          </div>

          <div
            data-home-reveal
            className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14"
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#E1C58E]">
              Trust and transparency
            </p>

            <h2 className="mt-4 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
              Your group. Your money. Your shared commitment.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-white/75">
              Savings groups work best when members understand their
              contributions, the payout order and the rules they have
              agreed to follow.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-5 border-t border-white/20 pt-6">
              <div>
                <p className="text-lg font-bold text-[#E1C58E]">
                  Clear records
                </p>

                <p className="mt-2 text-sm text-white/75">
                  Organised contribution and payout information.
                </p>
              </div>

              <div>
                <p className="text-lg font-bold text-[#E1C58E]">
                  Shared visibility
                </p>

                <p className="mt-2 text-sm text-white/75">
                  Clearer group schedules and member information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative overflow-hidden">
        <div
          data-home-reveal
          className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-20"
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#B18B48]">
            Start your journey
          </p>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to save together?
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-text-muted">
            Bring your group together and take the next step towards
            your shared savings goals.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-[#452044] px-7 py-3.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#351732] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B18B48]"
            >
              Create an account
            </Link>

            <Link
              to="/login"
              className="rounded-xl border border-border px-7 py-3.5 text-sm font-bold transition duration-300 hover:-translate-y-0.5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B18B48]"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
