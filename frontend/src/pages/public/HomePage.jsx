import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import {
  Activity,
  HeartPulse,
  Brain,
  Bone,
  Sparkles,
  Eye,
  Baby,
  CalendarCheck,
  FlaskConical,
  Pill,
  ShieldCheck,
  Stethoscope,
  Clock,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Lock,
  Building2,
  Users,
  Award,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';

const specializations = [
  { 
    icon: HeartPulse, 
    name: 'Cardiology',    
    desc: 'Advanced cardiovascular diagnostics, catheterization, and post-op care.',
    color: 'red'
  },
  { 
    icon: Brain, 
    name: 'Neurology',     
    desc: 'State-of-the-art neurological intervention, EEG monitoring, and therapy.',
    color: 'purple'
  },
  { 
    icon: Bone, 
    name: 'Orthopedics',   
    desc: 'Comprehensive joint reconstruction, trauma management, and sports medicine.',
    color: 'amber'
  },
  { 
    icon: Sparkles, 
    name: 'Dermatology',   
    desc: 'Clinical dermatology, laser therapeutics, and specialized skin pathology.',
    color: 'teal'
  },
  { 
    icon: Baby, 
    name: 'Pediatrics',    
    desc: 'Specialized neonatal intensive care, vaccinations, and pediatric wellness.',
    color: 'blue'
  },
  { 
    icon: Eye, 
    name: 'Ophthalmology', 
    desc: 'Precision eye microsurgery, refractive care, and retinal disorders.',
    color: 'indigo'
  },
];

const hospitalCapabilities = [
  {
    icon: CalendarCheck,
    title: 'Smart Scheduling',
    desc: 'Book immediate specialist appointments with verified doctor availability.'
  },
  {
    icon: FlaskConical,
    title: 'Integrated Diagnostics',
    desc: 'Automated digital lab orders with rapid laboratory analysis reports.'
  },
  {
    icon: Pill,
    title: 'Precision Pharmacy',
    desc: 'Direct electronic prescriptions sent immediately to dispensing stations.'
  },
  {
    icon: ShieldCheck,
    title: 'Unified Health Records',
    desc: 'HIPAA-compliant medical histories accessible securely anytime, anywhere.'
  }
];

const clinicalSteps = [
  { 
    num: '01', 
    icon: CalendarCheck, 
    title: 'Reserve Specialist', 
    desc: 'Select specialty, verified consultant doctor, and preferred time slot.' 
  },
  { 
    num: '02', 
    icon: Stethoscope, 
    title: 'Clinical Consultation', 
    desc: 'In-person diagnosis utilizing hospital modern examination facilities.' 
  },
  { 
    num: '03', 
    icon: FileSpreadsheet, 
    title: 'Digital Treatment Plan', 
    desc: 'Direct e-prescription, integrated laboratory tests, and medication advice.' 
  },
  { 
    num: '04', 
    icon: HeartPulse, 
    title: 'Patient Follow-Up', 
    desc: 'Review test results online and schedule follow-ups without waiting.' 
  },
];

const HomePage = () => {
  return (
    <div className="home-page">
      <Navbar />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-grid-pattern" />
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="hero-content">
          <div className="hero-left animate-slide-up">
            <div className="hero-badge">
              <span className="badge-pulse-dot" />
              <span>Certified Healthcare Enterprise System</span>
            </div>

            <h1 className="hero-title">
              Precision Clinical Care,<br />
              <span>Unified Healthcare Platform</span>
            </h1>

            <p className="hero-desc">
              MediCare Hospital Management System integrates doctor appointments, diagnostic 
              laboratories, in-patient wards, and electronic prescriptions into a seamless, 
              secure clinical workspace.
            </p>

            <div className="hero-actions">
              <Link to="/book-appointment" className="btn btn-primary btn-lg">
                <CalendarCheck size={18} />
                <span>Book Appointment</span>
              </Link>
              <Link to="/book-lab-test" className="btn btn-outline btn-lg hero-btn-outline">
                <FlaskConical size={18} />
                <span>Book Lab Test</span>
              </Link>
              <Link to="/login" className="btn btn-glass btn-lg">
                <Lock size={18} />
                <span>Staff Portal</span>
              </Link>
            </div>

            {/* Live Stats */}
            <div className="hero-stats-row">
              <div className="hero-stat-box">
                <div className="hero-stat-number">15,000+</div>
                <div className="hero-stat-title">Patients Managed</div>
              </div>
              <div className="hero-stat-box">
                <div className="hero-stat-number">65+</div>
                <div className="hero-stat-title">Consultant Doctors</div>
              </div>
              <div className="hero-stat-box">
                <div className="hero-stat-number">24 / 7</div>
                <div className="hero-stat-title">Emergency Response</div>
              </div>
              <div className="hero-stat-box">
                <div className="hero-stat-number">99.8%</div>
                <div className="hero-stat-title">Uptime & Reliability</div>
              </div>
            </div>
          </div>

          {/* Right Visual Dashboard Mockup */}
          <div className="hero-right animate-fade-in">
            <div className="hero-terminal-card">
              <div className="terminal-card-header">
                <div className="terminal-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="terminal-title">MediCare Live Clinical Stream</div>
                <div className="terminal-tag">SYSTEM ONLINE</div>
              </div>

              <div className="terminal-card-body">
                <div className="stream-grid">
                  {hospitalCapabilities.map((c) => {
                    const Icon = c.icon;
                    return (
                      <div className="stream-item" key={c.title}>
                        <div className="stream-item-icon">
                          <Icon size={20} />
                        </div>
                        <div className="stream-item-content">
                          <h4>{c.title}</h4>
                          <p>{c.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="terminal-footer-alert">
                  <Activity size={16} className="text-emerald" />
                  <span>Integrated Real-time OPD Queue & Ward Monitoring Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BANNER */}
      <section className="trust-strip">
        <div className="trust-strip-inner">
          <div className="trust-item">
            <ShieldCheck size={20} className="trust-icon" />
            <span>HIPAA Compliant Security</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <Award size={20} className="trust-icon" />
            <span>ISO 9001:2015 Accredited</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <Clock size={20} className="trust-icon" />
            <span>Zero Queue Wait Time with e-Slots</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <Lock size={20} className="trust-icon" />
            <span>256-Bit Encrypted Patient Records</span>
          </div>
        </div>
      </section>

      {/* SPECIALIZATIONS */}
      <section className="section specializations-section" id="services">
        <div className="section-center">
          <span className="section-tag">Clinical Departments</span>
          <h2 className="section-title">Specialized Centers of Excellence</h2>
          <p className="section-desc">
            Our medical board brings together leading board-certified physicians, 
            cutting-edge robotic equipment, and evidence-based clinical protocols.
          </p>
        </div>

        <div className="services-grid">
          {specializations.map((s) => {
            const Icon = s.icon;
            return (
              <div className="service-card" key={s.name}>
                <div className={`service-icon-box ${s.color}`}>
                  <Icon size={26} strokeWidth={2.2} />
                </div>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
                <Link to="/book-appointment" className="service-learn-more">
                  <span>Consult Specialist</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* CLINICAL WORKFLOW */}
      <section className="section workflow-section">
        <div className="section-center">
          <span className="section-tag">Patient Experience</span>
          <h2 className="section-title">Seamless 4-Step Patient Journey</h2>
          <p className="section-desc">
            Designed to eliminate bureaucratic bottlenecks and deliver prompt, compassionate care.
          </p>
        </div>

        <div className="workflow-grid">
          {clinicalSteps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="workflow-step-card">
                <div className="step-num-badge">{s.num}</div>
                <div className="step-icon-container">
                  <Icon size={28} />
                </div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* EMERGENCY & FAST ACTION CTA */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-left">
            <div className="cta-badge">
              <PhoneCall size={14} />
              <span>Immediate Medical Assistance</span>
            </div>
            <h2>Need Urgent Consultation or Emergency Admission?</h2>
            <p>
              Our emergency room and intensive care units are fully equipped 
              and staffed around the clock with trauma surgeons and critical care nurses.
            </p>
          </div>
          <div className="cta-right">
            <div className="emergency-call-card">
              <div className="call-card-icon">
                <PhoneCall size={28} />
              </div>
              <div className="call-card-info">
                <span className="call-label">Emergency Dispatch (Toll-Free)</span>
                <a href="tel:1990" className="call-number">1990 / +94 11 234 5678</a>
              </div>
            </div>
            <div className="cta-actions-group">
              <Link to="/book-appointment" className="btn btn-primary btn-lg">
                <CalendarCheck size={18} />
                <span>Schedule Consultation</span>
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                <Users size={18} />
                <span>Staff Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ENTERPRISE FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-col-main">
            <div className="footer-brand">
              <div className="footer-brand-header">
                <div className="footer-brand-icon">
                  <Activity size={20} strokeWidth={2.4} />
                </div>
                <h3>MediCare HMS</h3>
              </div>
              <p>
                An enterprise-grade hospital information and clinical management platform 
                engineered for seamless operations, patient safety, and healthcare transparency.
              </p>
              <div className="footer-status-pill">
                <span className="status-dot-green" />
                <span>All Hospital Systems Operational</span>
              </div>
            </div>
          </div>

          <div className="footer-col">
            <h4>Quick Navigation</h4>
            <ul>
              <li><Link to="/">Home Overview</Link></li>
              <li><Link to="/book-appointment">Book Doctor Appointment</Link></li>
              <li><Link to="/book-lab-test">Laboratory Diagnostics</Link></li>
              <li><Link to="/login">Hospital Staff Login</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Medical Divisions</h4>
            <ul>
              <li><a href="#services">Cardiovascular Center</a></li>
              <li><a href="#services">Neurology & Neuro Surgery</a></li>
              <li><a href="#services">Pediatrics & Neonatal Care</a></li>
              <li><a href="#services">Trauma & Orthopedic Unit</a></li>
              <li><a href="#services">Diagnostic Pathology</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Hospital Contacts</h4>
            <ul className="footer-contact-list">
              <li>
                <strong>Central Line:</strong> +94 11 234 5678
              </li>
              <li>
                <strong>Ambulance:</strong> 1990 (24 Hours)
              </li>
              <li>
                <strong>Clinical Desk:</strong> info@medicare.lk
              </li>
              <li>
                <strong>Campus:</strong> 123 Healthcare Boulevard, Colombo 05
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <p>© {new Date().getFullYear()} MediCare Hospital Management System. All clinical rights reserved.</p>
            <div className="footer-badges">
              <span>HIPAA Certified</span>
              <span>•</span>
              <span>ISO 9001:2015</span>
              <span>•</span>
              <span>SSL 256-Bit</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
