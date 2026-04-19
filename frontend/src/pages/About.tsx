import { Users, MessageSquare, Zap, Globe, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const features = [
  {
    icon: <Users size={28} />,
    title: 'Communities',
    desc: 'Create or join student communities based on your interests, courses, or projects.',
  },
  {
    icon: <MessageSquare size={28} />,
    title: 'Interactive Posts',
    desc: 'Share your ideas, ask questions, and engage with peers through rich posts.',
  },
  {
    icon: <Zap size={28} />,
    title: 'Live Sessions',
    desc: 'Host or join real-time collaboration sessions for group projects and study circles.',
  },
  {
    icon: <Globe size={28} />,
    title: 'Knowledge Sharing',
    desc: 'Build a collective knowledge base by sharing notes, resources, and experiences.',
  },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold leading-tight
                           text-text-dark [html.light_&]:text-text-light">
              About{' '}
              <span className="gradient-text">SocialHive</span>
            </h1>
            <p className="mt-6 text-lg text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed">
              SocialHive is a platform for students to connect and collaborate in projects and share their knowledge through communities. We believe learning is better together.
            </p>
          </div>
        </section>

        {/* Features grid */}
        <section className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl p-6 sm:p-8
                             glass-dark [html.light_&]:glass-light
                             hover:glow-sm transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center
                                  text-primary group-hover:scale-110 transition-transform duration-300">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold
                                 text-text-dark [html.light_&]:text-text-light">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <div className="rounded-2xl p-8 sm:p-12
                            glass-dark [html.light_&]:glass-light glow-sm">
              <Heart size={32} className="text-danger mx-auto" />
              <h2 className="mt-4 font-display text-2xl font-bold
                             text-text-dark [html.light_&]:text-text-light">
                Our Mission
              </h2>
              <p className="mt-4 text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed">
                We're on a mission to make student collaboration seamless. Whether you're working on a group project, studying for exams, or building something new — SocialHive gives you the tools to connect, share, and grow together.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
