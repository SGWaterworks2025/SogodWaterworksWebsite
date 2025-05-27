# SOGOD WATERWORKS Cebu Province Website

A comprehensive static website for SOGOD WATERWORKS (Sogod Water Works) in Cebu Province, featuring dynamic themes, appointment booking, and extensive archived content. Built for GitHub Pages deployment with custom domain support.

## Table of Contents

- [Introduction & Project Overview](#introduction--project-overview)
- [Features](#features)
- [Site Content Overview](#site-content-overview)
- [File Structure](#file-structure)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License & Contact](#license--contact)

## Introduction & Project Overview

The SOGOD WATERWORKS Cebu Province website serves as the official digital presence for the water utility department, providing citizens and stakeholders with access to services, programs, and organizational information. The site emphasizes user experience through responsive design, dynamic theming, and integrated appointment booking.

**Key Technologies:**
- Modern HTML5 structure with semantic markup
- CSS3 with responsive grid layouts and custom properties
- Vanilla JavaScript for dynamic interactions
- FullCalendar integration for appointment scheduling
- Google Forms embedding for service requests
- GitHub Pages hosting with custom domain configuration

**Primary Goals:**
- Provide accessible information about water services and programs
- Enable online appointment booking through integrated calendar system
- Showcase organizational structure and transparency initiatives
- Maintain extensive archive of historical content and documentation

## Features

### Dynamic Day/Night Theme Switching
- **Automatic time-based theming** using `assets/js/background-switcher.js` and `assets/js/main-background-switcher.js`
- **Philippines timezone detection** (Asia/Manila) for accurate day/night transitions
- **Multiple background variants** with cache-busting for smooth transitions
- **Responsive background positioning** across all device sizes

### Calendar Integration & Appointment Booking
- **FullCalendar implementation** in `index.html` with Google Calendar sync
- **Real-time calendar updates** connected to `sogodwaterworks2025@gmail.com`
- **Embedded Google Form** in `form.html` for appointment requests
- **Mobile-optimized calendar views** with touch-friendly navigation

### Advanced Navigation System
- **Multi-level dropdown menus** with sophisticated CSS from `styles.css` and `menu.css`
- **Responsive mobile navigation** with hamburger menu and touch-friendly interactions
- **Grid-based desktop layout** with organized menu structure
- **Accessibility features** including keyboard navigation and focus management

### Custom Typography & Visual Design
- **Custom font integration** including EuphoriaScript and Whitehella fonts in `assets/fonts/`
- **Responsive image slider** with automatic transitions and touch/swipe support
- **Organizational chart displays** with hover effects and mobile adaptations
- **Professional styling** with consistent branding throughout

### Content Management Features
- **Extensive archived content** in `archivedsites/` covering historical programs and initiatives
- **Template system** for consistent page creation and maintenance
- **SEO-optimized structure** with proper meta tags and semantic HTML
- **Print-friendly layouts** for official documents and forms

## Site Content Overview

### Main Pages
- **`index.html`** - Homepage featuring integrated calendar, appointment booking links, and dynamic background themes
- **`form.html`** - Dedicated appointment booking page with embedded Google Form and calendar view options

### Archived Content in `archivedsites/`
The website maintains an extensive archive of content covering various programs and organizational aspects:

- **About Us & History** - Organizational background, mandate, and historical development
- **Programs & Services** - Detailed information about water service programs, community initiatives
- **Transparency & Governance** - Full disclosure policies, organizational charts, key officials
- **News & Updates** - Current events, announcements, and program updates
- **Procurement & Legal** - Bidding processes, notices to proceed, vacant positions
- **Contact & Support** - Contact information, field offices, attached agencies

Each archived page maintains the same responsive design and navigation structure as the main site, ensuring consistent user experience across all content.

## File Structure

```
/ (root)
├── index.html                    # Main homepage with calendar integration
├── form.html                     # Appointment booking page with Google Form
├── styles.css                    # Primary stylesheet with responsive design
├── menu.css                      # Advanced navigation and dropdown styles
├── CNAME                         # Custom domain configuration (sogodwaterwork.duckdns.org)
├── archivedsites/                # Archived content and historical pages
│   └── [extensive archived content]
├── assets/                       # Static assets and resources
│   ├── js/                       # JavaScript functionality
│   │   ├── background-switcher.js      # General background theme switching
│   │   └── main-background-switcher.js # Homepage-specific theme management
│   └── fonts/                    # Custom typography files
│       ├── EuphoriaScript-Regular.ttf  # Script font for branding
│       └── Whitehella.otf              # Display font for headings
├── sogodassets/                  # Site-specific assets
│   └── image/                    # Logo and branding images
│       └── logosogod.png         # Official SOGOD WATERWORKS logo
└── README.md                     # This documentation file
```

## Tech Stack

### Frontend Technologies
- **HTML5** - Semantic markup with accessibility features
- **CSS3** - Modern styling with Grid, Flexbox, and custom properties
- **Vanilla JavaScript** - Dynamic interactions without framework dependencies
- **Responsive Design** - Mobile-first approach with progressive enhancement

### Third-Party Integrations
- **FullCalendar 6.1.15** - Advanced calendar functionality with Google Calendar sync
- **Google Forms** - Embedded appointment booking and service request forms
- **Google Calendar API** - Real-time calendar data synchronization
- **Web Fonts** - Custom typography loading with fallback support

### Hosting & Deployment
- **GitHub Pages** - Static site hosting with automatic deployment
- **Custom Domain** - DNS configuration through DuckDNS service
- **CDN Integration** - External library loading for optimal performance

### Development Tools
- **Git Version Control** - Source code management and collaboration
- **Responsive Testing** - Cross-device compatibility verification
- **Performance Optimization** - Asset optimization and caching strategies

## Local Development

### Prerequisites
- Git for version control
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local HTTP server (to avoid CORS issues with fonts and external resources)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/sogodwaterworks-website.git
   cd sogodwaterworks-website
   ```

2. **Start a local server:**
   
   **Option A: Python 3**
   ```bash
   python3 -m http.server 8000
   ```
   
   **Option B: Node.js**
   ```bash
   npm install -g http-server
   http-server -p 8000
   ```
   
   **Option C: PHP**
   ```bash
   php -S localhost:8000
   ```

3. **Access the site:**
   Open your browser and navigate to `http://localhost:8000`

4. **Development workflow:**
   - Edit files using your preferred code editor
   - Refresh the browser to see changes
   - Test responsive design using browser developer tools
   - Verify all navigation links and interactive elements

### Testing Checklist
- [ ] All pages load correctly without 404 errors
- [ ] Navigation menus function properly on desktop and mobile
- [ ] Calendar integration displays correctly
- [ ] Background theme switching works based on time
- [ ] Forms submit successfully (test mode)
- [ ] Responsive design works across different screen sizes
- [ ] Custom fonts load properly
- [ ] All images display correctly

## Deployment

### GitHub Pages Setup

1. **Repository Configuration:**
   - Ensure your repository is public or has GitHub Pages enabled
   - Go to repository Settings > Pages
   - Select source branch (typically `main` or `master`)
   - Save configuration

2. **Custom Domain Setup:**
   - The `CNAME` file is pre-configured for `sogodwaterwork.duckdns.org`
   - Ensure DNS records point to GitHub Pages servers:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```

3. **SSL Certificate:**
   - GitHub Pages automatically provides SSL certificates for custom domains
   - Allow 24-48 hours for certificate provisioning after DNS configuration

4. **Deployment Verification:**
   - Visit your custom domain to verify deployment
   - Test all functionality including calendar integration
   - Verify mobile responsiveness and cross-browser compatibility

### Environment Configuration

- **Google Calendar Integration:** Ensure the calendar `sogodwaterworks2025@gmail.com` is publicly accessible
- **API Keys:** Verify Google Calendar API key is properly configured and has necessary permissions
- **Form Integration:** Test Google Form submissions and response handling

## Contributing

We welcome contributions to improve the SOGOD WATERWORKS website. Please follow these guidelines:

### Development Process

1. **Fork the repository** to your GitHub account
2. **Create a feature branch** from the main branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the existing code style and structure
4. **Test thoroughly** using the local development setup
5. **Update documentation** if you add new features or change existing functionality
6. **Submit a pull request** with a clear description of your changes

### Code Standards

- **HTML:** Use semantic markup and maintain accessibility standards
- **CSS:** Follow the existing naming conventions and responsive design patterns
- **JavaScript:** Write clean, commented code with error handling
- **File Organization:** Maintain the existing directory structure and naming conventions

### Content Guidelines

- **Accuracy:** Ensure all information is current and accurate
- **Accessibility:** Maintain WCAG 2.1 AA compliance standards
- **Performance:** Optimize images and assets for web delivery
- **SEO:** Include appropriate meta tags and structured data

## License & Contact

### License
This project is licensed under the MIT License. See the LICENSE file for details.

### Support & Contact
For technical issues, feature requests, or general inquiries:

- **Email:** support@traycer.ai
- **Issues:** Use the GitHub Issues tracker for bug reports and feature requests
- **Documentation:** Refer to this README for setup and development guidance

### Acknowledgments
- SOGOD WATERWORKS Cebu Province for project requirements and content
- FullCalendar team for the excellent calendar integration library
- GitHub Pages for reliable static site hosting
- DuckDNS for custom domain services

---

**Last Updated:** January 2025  
**Version:** 2.0.0  
**Maintained by:** SOGOD WATERWORKS Web Development Team
