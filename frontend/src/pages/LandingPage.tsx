import { Link } from 'react-router-dom';
import { UserPlus, LogIn } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 lg:gap-20 items-center">

            {/* Left: Text Content */}
            <div className="text-center">
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight">
                <span className="text-text-dark [html.light_&]:text-text-light">Social Hive</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-text-muted-dark [html.light_&]:text-text-muted-light
                            max-w-lg mx-auto leading-relaxed">
                Post, Create Communities, Channels and Collaborate by hosting live sessions in One Place!
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center gap-4
                              justify-center">
                <Link
                  to="/login"
                  className="group flex items-center gap-2 px-8 py-3.5 rounded-full
                             border-2 border-border-dark [html.light_&]:border-border-light
                             text-text-dark [html.light_&]:text-text-light
                             hover:border-primary hover:text-primary
                             bg-surface-card-dark [html.light_&]:bg-surface-card-light
                             transition-all duration-300 font-semibold text-base
                             no-underline min-w-[180px] justify-center
                             hover:shadow-lg hover:shadow-primary/10"
                >
                  <LogIn size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="group flex items-center gap-2 px-8 py-3.5 rounded-full
                             bg-primary text-white hover:bg-primary-light
                             transition-all duration-300 font-semibold text-base
                             no-underline min-w-[180px] justify-center
                             shadow-lg shadow-primary/30 hover:shadow-primary/50
                             hover:-translate-y-0.5"
                >
                  <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                  Register
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature pills */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Communities', desc: 'Join groups and create study circles' },
            { title: 'Live Sessions', desc: 'Collaborate in real-time with peers' },
            { title: 'Share Knowledge', desc: 'Post and discuss ideas together' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl p-6
                         glass-dark [html.light_&]:glass-light
                         hover:glow-sm transition-all duration-300
                         group cursor-default"
            >
              <h3 className="font-display font-semibold text-lg text-text-dark [html.light_&]:text-text-light
                             group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
