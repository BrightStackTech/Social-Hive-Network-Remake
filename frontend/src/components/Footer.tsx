import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();
  return (
    <footer className="w-full border-t border-border-dark [html.light_&]:border-border-light
                       bg-surface-dark [html.light_&]:bg-surface-light transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to={user ? "/explore" : "/"} className="flex items-center gap-2 mb-4 no-underline">
              <img
                src="https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png"
                alt="SocialHive"
                className="h-8 w-8 rounded-lg object-cover shadow-md shadow-primary/20"
              />
              <span className="text-lg font-display font-bold text-text-dark
                               [html.light_&]:text-text-light">
                SocialHive
              </span>
            </Link>
            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light leading-relaxed max-w-xs">
              A platform for students to connect and collaborate in projects and share their knowledge through communities.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4
                           text-text-dark [html.light_&]:text-text-light">
              Contact Me
            </h4>
            <ul className="space-y-2 list-none p-0 m-0">
              <li className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">
                Email:
              </li>
              <li>
                <a
                  href="mailto:socialhiveproject@gmail.com"
                  className="text-sm text-primary hover:text-primary-light transition-colors no-underline"
                >
                  socialhiveproject@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4
                           text-text-dark [html.light_&]:text-text-light">
              Follow Me
            </h4>
            <ul className="space-y-2 list-none p-0 m-0">
              <li>
                <a
                  href="#"
                  className="text-sm text-text-muted-dark hover:text-primary
                             [html.light_&]:text-text-muted-light transition-colors no-underline
                             flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4
                           text-text-dark [html.light_&]:text-text-light">
              Legal
            </h4>
            <ul className="space-y-2 list-none p-0 m-0">
              <li>
                <a href="#" className="text-sm text-text-muted-dark hover:text-primary
                                       [html.light_&]:text-text-muted-light transition-colors no-underline">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-text-muted-dark hover:text-primary
                                       [html.light_&]:text-text-muted-light transition-colors no-underline">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border-dark [html.light_&]:border-border-light
                        text-center">
          <p className="text-xs text-text-muted-dark [html.light_&]:text-text-muted-light">
            © {new Date().getFullYear()} SocialHive. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
