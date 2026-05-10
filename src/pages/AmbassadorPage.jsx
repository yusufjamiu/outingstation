import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import OutingStation from '../assets/OutingStation.png';

export default function AmbassadorPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    university: '',
    instagram: '',
    tiktok: '',
    twitter: '',
    followers: '',
    whyAmbassador: '',
    howPromote: '',
    expectedReferrals: '',
    agreeTerms: false,
    agreeActive: false,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.agreeTerms || !formData.agreeActive) {
      setError('Please agree to both terms before submitting.');
      return;
    }

    if (!formData.instagram && !formData.tiktok && !formData.twitter) {
      setError('Please provide at least one social media handle.');
      return;
    }

    try {
      setLoading(true);

      // Check if email already applied
      const q = query(
        collection(db, 'ambassadorApplications'),
        where('email', '==', formData.email.toLowerCase())
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        setError('This email has already submitted an application.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'ambassadorApplications'), {
        ...formData,
        email: formData.email.toLowerCase(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: '⭐', title: 'Ambassador Badge', desc: 'Exclusive badge on your OutingStation profile' },
    { icon: '💰', title: '₦500 Per Referral', desc: 'Earn more than regular users who get ₦300' },
    { icon: '🎟️', title: 'Early Event Access', desc: 'See events before they go public' },
    { icon: '📜', title: 'Official Certificate', desc: 'From OutingStation Limited (CAC Registered)' },
    { icon: '🏆', title: 'Top Ambassador Recognition', desc: 'Featured on our platform and socials' },
    { icon: '🚀', title: 'First To Know', desc: 'Early access to new features and launches' },
  ];

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.successContainer}>
          <div style={styles.successIcon}>🎉</div>
          <h1 style={styles.successTitle}>Application Submitted!</h1>
          <p style={styles.successText}>
            Thank you for applying to become an OutingStation Ambassador!
            We'll review your application and get back to you within <strong>48 hours</strong>.
          </p>
          <div style={styles.successCard}>
            <p style={styles.successCardText}>
              Keep an eye on your email <strong>{formData.email}</strong> for our response.
            </p>
          </div>
          <a href="https://www.outingstation.com" style={styles.successBtn}>
            Visit OutingStation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Background decorations */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src={OutingStation} alt="OutingStation" style={styles.logo} />
        </div>

        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroBadge}>🌟 Ambassador Program</div>
          <h1 style={styles.heroTitle}>
            Become an OutingStation
            <span style={styles.heroAccent}> Ambassador</span>
          </h1>
          <p style={styles.heroSub}>
            Join our exclusive team of ambassadors and help bring OutingStation to your campus.
            Earn rewards, gain recognition, and be part of something big.
          </p>
        </div>

        {/* Benefits */}
        <div style={styles.benefitsSection}>
          <h2 style={styles.benefitsTitle}>What You Get 🎁</h2>
          <div style={styles.benefitsGrid}>
            {benefits.map((b, i) => (
              <div key={i} style={styles.benefitCard}>
                <div style={styles.benefitIcon}>{b.icon}</div>
                <h3 style={styles.benefitCardTitle}>{b.title}</h3>
                <p style={styles.benefitCardDesc}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Apply Now</h2>
            <p style={styles.formSub}>Fill in your details and we'll get back to you within 48 hours</p>
          </div>

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Personal Info */}
            <div style={styles.sectionLabel}>Personal Information</div>
            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name *</label>
                <input
                  style={styles.input}
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Amara Johnson"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email Address *</label>
                <input
                  style={styles.input}
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Phone Number *</label>
                <input
                  style={styles.input}
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>City *</label>
                <input
                  style={styles.input}
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Lagos, Abuja"
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>University / Institution (if applicable)</label>
              <input
                style={styles.input}
                type="text"
                name="university"
                value={formData.university}
                onChange={handleChange}
                placeholder="e.g. University of Lagos"
              />
            </div>

            {/* Social Media */}
            <div style={styles.sectionLabel}>Social Media Presence</div>
            <p style={styles.sectionNote}>Provide at least one social media handle *</p>

            <div style={styles.grid3}>
              <div style={styles.field}>
                <label style={styles.label}>Instagram</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputPrefix}>@</span>
                  <input
                    style={styles.inputWithPrefix}
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    placeholder="yourhandle"
                  />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>TikTok</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputPrefix}>@</span>
                  <input
                    style={styles.inputWithPrefix}
                    type="text"
                    name="tiktok"
                    value={formData.tiktok}
                    onChange={handleChange}
                    placeholder="yourhandle"
                  />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Twitter/X</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputPrefix}>@</span>
                  <input
                    style={styles.inputWithPrefix}
                    type="text"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    placeholder="yourhandle"
                  />
                </div>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Approximate Total Followers *</label>
              <select
                style={styles.select}
                name="followers"
                required
                value={formData.followers}
                onChange={handleChange}
              >
                <option value="">Select follower range</option>
                <option value="0-500">0 - 500</option>
                <option value="500-1k">500 - 1,000</option>
                <option value="1k-5k">1,000 - 5,000</option>
                <option value="5k-10k">5,000 - 10,000</option>
                <option value="10k+">10,000+</option>
              </select>
            </div>

            {/* Questions */}
            <div style={styles.sectionLabel}>Tell Us About Yourself</div>

            <div style={styles.field}>
              <label style={styles.label}>Why do you want to be an OutingStation Ambassador? *</label>
              <textarea
                style={styles.textarea}
                name="whyAmbassador"
                required
                value={formData.whyAmbassador}
                onChange={handleChange}
                placeholder="Tell us why you're passionate about OutingStation and what makes you a great fit..."
                rows={4}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>How will you promote OutingStation? *</label>
              <textarea
                style={styles.textarea}
                name="howPromote"
                required
                value={formData.howPromote}
                onChange={handleChange}
                placeholder="Describe your strategy — social posts, word of mouth, campus events, etc..."
                rows={4}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>How many referrals do you expect in your first month?</label>
              <select
                style={styles.select}
                name="expectedReferrals"
                value={formData.expectedReferrals}
                onChange={handleChange}
              >
                <option value="">Select a range</option>
                <option value="1-5">1 - 5</option>
                <option value="5-10">5 - 10</option>
                <option value="10-20">10 - 20</option>
                <option value="20-50">20 - 50</option>
                <option value="50+">50+</option>
              </select>
            </div>

            {/* Agreement */}
            <div style={styles.sectionLabel}>Agreement</div>

            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  style={styles.checkbox}
                />
                <span>
                  I agree to actively promote OutingStation on my platforms and represent the brand positively.
                </span>
              </label>
            </div>

            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="agreeActive"
                  checked={formData.agreeActive}
                  onChange={handleChange}
                  style={styles.checkbox}
                />
                <span>
                  I understand that ambassador status can be revoked if I become inactive or violate OutingStation's guidelines.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={loading ? styles.btnDisabled : styles.btn}
            >
              {loading ? (
                <span>Submitting...</span>
              ) : (
                <span>Submit Application ⭐</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          © {new Date().getFullYear()} OutingStation Limited (CAC Registered) · Nigeria
        </p>
      </div>
    </div>
  );
}

const cyan = '#06b6d4';
const cyanDark = '#0891b2';
const yellow = '#F59E0B';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #fefce8 100%)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'fixed',
    top: '-10rem',
    left: '-10rem',
    width: '30rem',
    height: '30rem',
    background: `radial-gradient(circle, ${cyan}22 0%, transparent 70%)`,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  blob2: {
    position: 'fixed',
    bottom: '-10rem',
    right: '-10rem',
    width: '30rem',
    height: '30rem',
    background: `radial-gradient(circle, ${yellow}22 0%, transparent 70%)`,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px 60px',
    position: 'relative',
    zIndex: 1,
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    height: '48px',
    width: 'auto',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  heroBadge: {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${cyan}, ${cyanDark})`,
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    padding: '6px 16px',
    borderRadius: '20px',
    marginBottom: '16px',
    letterSpacing: '0.5px',
  },
  heroTitle: {
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 1.2,
    margin: '0 0 16px',
  },
  heroAccent: {
    color: cyan,
  },
  heroSub: {
    fontSize: '17px',
    color: '#64748b',
    lineHeight: 1.7,
    maxWidth: '600px',
    margin: '0 auto',
  },
  benefitsSection: {
    marginBottom: '48px',
  },
  benefitsTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: '24px',
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  benefitCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s',
    cursor: 'default',
  },
  benefitIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  benefitCardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 6px',
  },
  benefitCardDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  formCard: {
    background: 'white',
    borderRadius: '24px',
    padding: 'clamp(24px, 5vw, 48px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    marginBottom: '32px',
  },
  formHeader: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #f1f5f9',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 8px',
  },
  formSub: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '14px',
    marginBottom: '24px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: cyan,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '16px',
    marginTop: '28px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${cyan}22`,
  },
  sectionNote: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: '-8px 0 16px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f8fafc',
    overflow: 'hidden',
  },
  inputPrefix: {
    padding: '12px 10px 12px 14px',
    color: cyan,
    fontWeight: '700',
    fontSize: '15px',
    background: `${cyan}11`,
    borderRight: `1px solid #e2e8f0`,
  },
  inputWithPrefix: {
    flex: 1,
    padding: '12px 14px',
    border: 'none',
    fontSize: '14px',
    color: '#0f172a',
    background: 'transparent',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    lineHeight: 1.6,
    fontFamily: 'inherit',
  },
  checkboxGroup: {
    marginBottom: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    flexShrink: 0,
    accentColor: cyan,
    cursor: 'pointer',
  },
  btn: {
    width: '100%',
    padding: '16px',
    background: `linear-gradient(135deg, ${cyan}, ${cyanDark})`,
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '24px',
    letterSpacing: '0.3px',
    boxShadow: `0 4px 20px ${cyan}44`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  btnDisabled: {
    width: '100%',
    padding: '16px',
    background: '#94a3b8',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'not-allowed',
    marginTop: '24px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
  },
  successContainer: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '80px 24px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '72px',
    marginBottom: '24px',
  },
  successTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '16px',
  },
  successText: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.7,
    marginBottom: '24px',
  },
  successCard: {
    background: `${cyan}11`,
    border: `1px solid ${cyan}33`,
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '32px',
  },
  successCardText: {
    fontSize: '14px',
    color: cyanDark,
    margin: 0,
  },
  successBtn: {
    display: 'inline-block',
    background: `linear-gradient(135deg, ${cyan}, ${cyanDark})`,
    color: 'white',
    padding: '14px 32px',
    borderRadius: '50px',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: `0 4px 20px ${cyan}44`,
  },
};