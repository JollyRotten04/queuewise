import Image from "next/image";
import Link from "next/link";
import Header from "./components/header";
import Footer from "./components/footer";
import ContentCard from "./components/content-card";
import Badge from "./components/badge";
import SectionHeading from "./components/section-heading";
import StepCard from "./components/step-card";
import PricingCard from "./components/pricing-card";
import FaqItem from "./components/faq-item";
import ContactForm from "./components/contact-form";
import { primaryButton, secondaryButton } from "./lib/styles";

const steps = [
  {
    tag: "On-site or Remote",
    title: "Scan QR or Book Online",
    description: "Customers scan a lobby QR kiosk or book an appointment from home—selecting General Consultation, Document Processing, or Priority Lanes.",
  },
  {
    tag: "Live Tracking",
    title: "Track Your Spot in Real Time",
    description: "Visitors see their position and estimated wait on their phone, so they can step out for coffee instead of standing in line.",
  },
  {
    tag: "Get Served",
    title: "Get Called to the Counter",
    description: "When it's their turn, visitors are notified and directed to the right counter. Staff serve, complete, and move to the next ticket in one tap.",
  },
];

const visitorFlow = [
  { icon: "⌖", title: "Choose a service", description: "Pick the service you need and whether you're walking in or booking ahead." },
  { icon: "🎫", title: "Get a digital ticket", description: "Receive a ticket number instantly. No paper, no app to install." },
  { icon: "⏱", title: "Wait anywhere", description: "Watch your position update live and get an estimate of your wait." },
  { icon: "🔔", title: "Answer the call", description: "Head to the counter shown on your ticket when you're called." },
];

const staffFlow = [
  { icon: "▤", title: "Set up your queues", description: "Create services, open counters, and set priority lanes for your branch." },
  { icon: "➜", title: "Call the next ticket", description: "Priority cases are surfaced first. Recall, complete, or mark no-shows quickly." },
  { icon: "⏸", title: "Control the flow", description: "Pause or reopen a queue during breaks, rush hours, or system maintenance." },
  { icon: "🗠", title: "Review performance", description: "See wait times by hour and volume by service to plan staffing better." },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For small offices trying digital queueing.",
    features: ["1 branch", "1 service queue", "Up to 100 tickets per day", "QR kiosk and web tickets"],
  },
  {
    name: "Professional",
    price: "₱1,499",
    period: "/ month",
    description: "For busy clinics and service centers.",
    features: ["Up to 3 branches", "Unlimited service queues", "Priority lanes", "Appointments and walk-ins", "Analytics dashboard"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For government offices and multi-branch networks.",
    features: ["Unlimited branches", "Role-based staff access", "Display board integration", "Dedicated support"],
  },
];

const industries = [
  { icon: "✚", title: "Clinics & Hospitals", description: "Consultations and lab visits" },
  { icon: "🏛", title: "Government Offices", description: "Permits and document requests" },
  { icon: "🏦", title: "Banks", description: "Teller and account services" },
  { icon: "🎓", title: "Schools", description: "Registrar and enrollment" },
];

const benefits = [
  { icon: "♿", title: "Inclusive by Design", description: "Priority lanes for seniors, PWDs, pregnant visitors, and urgent cases are built into the queue order." },
  { icon: "📱", title: "No App Needed", description: "Visitors use any phone browser. Those without a phone can get a ticket at the lobby kiosk." },
  { icon: "📺", title: "Lobby Display Board", description: "Show who's being served and who's next on any TV, so nobody misses their call." },
  { icon: "⏸", title: "Flexible Operations", description: "Pause queues for breaks, open more counters at peak hours, and mix walk-ins with appointments." },
];

const privacyPoints = [
  { icon: "🔒", title: "Minimal Data", description: "We only ask for a name and an optional mobile number—just enough to manage the queue." },
  { icon: "✓", title: "Consent First", description: "Visitors agree to how their details are used before they get a ticket." },
  { icon: "👤", title: "Role-Based Access", description: "Staff only see the queues and branches they're assigned to." },
  { icon: "🔗", title: "Private Ticket Links", description: "Ticket pages show a ticket number and status, never the visitor's personal details." },
];

const faqs = [
  {
    question: "Do visitors need to download an app?",
    answer: "No. Visitors scan a QR code or open a link in any phone browser to join the queue and track their ticket. A lobby kiosk is available for those without a phone.",
  },
  {
    question: "How is the estimated wait time calculated?",
    answer: "QueueWise uses your position in line, the number of open counters, and the average service time for that service. It updates as the queue moves, so treat it as a guide rather than an exact time.",
  },
  {
    question: "How do priority lanes work?",
    answer: "Visitors can choose Senior Citizen, Person with Disability, Pregnant, or Urgent Case when joining. Staff call priority tickets first and confirm eligibility with a valid ID at the counter.",
  },
  {
    question: "What happens if I miss my turn?",
    answer: "Staff can recall your number a few times. If you still don't show up, the ticket is marked as a no-show and you can rejoin the queue from the Join page.",
  },
  {
    question: "Can I book an appointment instead of walking in?",
    answer: "Yes. Choose \"Book an appointment\" on the Join page, then pick a date and an available time slot. Your ticket becomes active on the day of your visit.",
  },
  {
    question: "Can I cancel my ticket?",
    answer: "Yes. Open your ticket page and tap \"Cancel My Ticket.\" This frees up your spot for the next person and can't be undone.",
  },
  {
    question: "Will I get notified when it's my turn?",
    answer: "Your ticket page updates automatically while it's open. If you add your mobile number, you can also get an SMS alert when you're almost up.",
  },
  {
    question: "Can we use QueueWise across multiple branches?",
    answer: "Yes. The Professional and Enterprise plans support multiple branches, each with its own services, counters, and staff access.",
  },
];

function IconTile({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 box-border h-full">
      <div className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-10 aspect-square flex items-center justify-center rounded-xl text-lg" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-black dark:text-zinc-50">{title}</h3>
      <p className="text-xs text-zinc-700 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function FlowColumn({ title, items }: { title: string; items: { icon: string; title: string; description: string }[] }) {
  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 sm:p-8 box-border">
      <h3 className="text-lg font-semibold text-black dark:text-zinc-50">{title}</h3>

      <ol className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.title} className="flex gap-4 items-start">
            <div className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-10 aspect-square flex items-center justify-center rounded-xl text-lg shrink-0" aria-hidden="true">
              {item.icon}
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-semibold text-black dark:text-zinc-50">{item.title}</p>
              <p className="text-xs text-zinc-700 dark:text-zinc-400">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col flex-1 w-full items-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="w-full">

        <section className="relative w-full overflow-hidden">

          <Image
            src="/hero-image.svg"
            alt=""
            fill
            priority
            className="object-cover object-center z-0 select-none pointer-events-none"
            draggable={false}
          />

          {/* Keeps hero text readable over the illustration on small screens and in dark mode. */}
          <div className="absolute inset-0 z-0 bg-white/60 sm:bg-transparent dark:bg-zinc-950/80" aria-hidden="true" />

          <div className="relative z-10 flex flex-col w-full px-4 sm:px-8 py-12 sm:py-16">
            <div className="flex flex-col max-w-[400px] gap-2">
              <Badge>Smart Queue. Better Experience</Badge>

              <h1 className="text-5xl sm:text-6xl font-bold text-black dark:text-zinc-50 text-start">
                Queue<span className="text-violet-600 dark:text-violet-400">Wise</span>
              </h1>

              <p className="text-lg text-start font-bold text-black dark:text-zinc-50">
                Join, Wait, Get Served
              </p>

              <p className="text-sm text-start font-semibold text-zinc-700 dark:text-zinc-300">
                A modern queue and appointment platform for clinics, government offices, banks, and more.
              </p>

              <div className="flex gap-4">
                <Link href="/join" className={`${primaryButton} mt-4 w-32`} draggable={false}>
                  Start Now →
                </Link>

                <Link href="#how-it-works" className={`${secondaryButton} mt-4 w-32`} draggable={false}>
                  ▷ Watch Demo
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 w-full">
              <ContentCard title="Real-Time Updates" description="Know your position instantly" icon="🗲" />
              <ContentCard title="Book & Join Queue" description="Walk in or schedule an appointment" icon="🄜" />
              <ContentCard title="Priority Lanes" description="Seniors, PWDs, and Urgent Cases" icon="☆" />
              <ContentCard title="Smart Analytics" description="Track performance and optimize service" icon="🗠" />
            </div>
          </div>
        </section>

        <section id="features" className="h-fit w-full bg-white dark:bg-black">

          <div className="px-4 sm:px-8 py-16 box-border flex flex-col gap-10 items-center max-w-6xl mx-auto">

            <SectionHeading
              badge="Seamless Flow"
              title="Features of"
              highlight="QueueWise"
              description="Eliminate crowded waiting rooms in three effortless steps for both visitors and frontline staff."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {steps.map((step, index) => (
                <StepCard key={step.title} step={index + 1} {...step} />
              ))}
            </div>

          </div>
        </section>

        <section id="how-it-works" className="w-full bg-zinc-50 dark:bg-zinc-950">

          <div className="px-4 sm:px-8 py-16 box-border flex flex-col gap-10 max-w-6xl mx-auto">

            <SectionHeading
              badge="Both Sides of the Counter"
              title="How It"
              highlight="Works"
              description="One platform that keeps visitors informed and gives staff the controls to keep the line moving."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FlowColumn title="For Visitors" items={visitorFlow} />
              <FlowColumn title="For Staff" items={staffFlow} />
            </div>

          </div>
        </section>

        <section id="pricing" className="w-full bg-white dark:bg-black">

          <div className="px-4 sm:px-8 py-16 box-border flex flex-col gap-12 max-w-6xl mx-auto">

            <SectionHeading
              badge="Simple Pricing"
              title="Plans that"
              highlight="Scale With You"
              description="Start free and upgrade when your queues grow. No setup fees."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {plans.map((plan) => (
                <PricingCard key={plan.name} {...plan} />
              ))}
            </div>

          </div>
        </section>

        <section id="about" className="w-full bg-zinc-50 dark:bg-zinc-950">

          <div className="px-4 sm:px-8 py-16 box-border flex flex-col gap-10 max-w-6xl mx-auto">

            <SectionHeading
              badge="About Us"
              title="Built for"
              highlight="Everyday Service"
              description="QueueWise was made for places where people wait the most. We help service teams respect their visitors' time while making priority care easier to manage."
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {industries.map((industry) => (
                <ContentCard key={industry.title} {...industry} />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => (
                <IconTile key={benefit.title} {...benefit} />
              ))}
            </div>

          </div>
        </section>

        <section id="privacy" className="w-full bg-white dark:bg-black">

          <div className="px-4 sm:px-8 py-16 box-border flex flex-col gap-10 max-w-6xl mx-auto">

            <SectionHeading
              badge="Privacy & Security"
              title="Your Visitors' Data,"
              highlight="Respected"
              description="Queueing shouldn't cost anyone their privacy. QueueWise collects only what it needs and keeps staff access limited."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {privacyPoints.map((point) => (
                <IconTile key={point.title} {...point} />
              ))}
            </div>

          </div>
        </section>

        <section id="faq" className="w-full bg-zinc-50 dark:bg-zinc-950">

          <div className="px-4 sm:px-8 py-16 box-border flex flex-col gap-10 max-w-3xl mx-auto">

            <SectionHeading
              badge="FAQ"
              title="Frequently Asked"
              highlight="Questions"
              description="Everything visitors and staff usually ask before getting started."
            />

            <div className="flex flex-col gap-3">
              {faqs.map((faq) => (
                <FaqItem key={faq.question} {...faq} />
              ))}
            </div>

            <p className="text-xs text-center text-zinc-600 dark:text-zinc-400">
              Still have questions? <Link href="#contact" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">Contact our team</Link>.
            </p>

          </div>
        </section>

        <section id="contact" className="w-full bg-white dark:bg-black">

          <div className="px-4 sm:px-8 py-16 box-border grid grid-cols-1 lg:grid-cols-5 gap-10 max-w-6xl mx-auto">

            <div className="lg:col-span-2 flex flex-col gap-4">
              <Badge>Get in Touch</Badge>

              <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50">
                Let&apos;s Talk About <span className="text-violet-600 dark:text-violet-400">Your Queues</span>
              </h2>

              <p className="text-sm text-zinc-700 dark:text-zinc-400">
                Book a demo, ask about pricing, or get help setting up your branch. We usually reply within one business day.
              </p>

              <ul className="flex flex-col gap-3 mt-2">
                {[
                  { icon: "✉", label: "Email", value: "hello@queuewise.example" },
                  { icon: "☎", label: "Phone", value: "(000) 000-0000" },
                  { icon: "⏱", label: "Support hours", value: "Mon–Fri, 8:00 AM – 6:00 PM" },
                ].map((item) => (
                  <li key={item.label} className="flex gap-3 items-center">
                    <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-9 aspect-square flex items-center justify-center rounded-lg" aria-hidden="true">{item.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</span>
                      <span className="text-sm font-semibold text-black dark:text-zinc-50">{item.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <ContactForm />
            </div>

          </div>
        </section>

        <section className="w-full bg-white dark:bg-black px-4 sm:px-8 py-16">
          <div className="max-w-6xl mx-auto bg-violet-600 rounded-xl shadow-lg px-6 py-10 sm:px-12 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex flex-col gap-2 text-center md:text-start">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to end the long lines?</h2>
              <p className="text-sm text-violet-100">Set up your first queue in minutes. Your visitors will thank you.</p>
            </div>

            <div className="flex gap-4 shrink-0">
              <Link href="/signup" className="inline-flex items-center justify-center bg-white rounded-full px-4 py-2 text-violet-600 text-xs font-semibold select-none hover:scale-110 transition-transform duration-300 ease-in-out">
                Get Started
              </Link>

              <Link href="/join" className="inline-flex items-center justify-center border border-white rounded-full px-4 py-2 text-white text-xs font-semibold select-none hover:scale-110 transition-transform duration-300 ease-in-out">
                Join a Queue
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
