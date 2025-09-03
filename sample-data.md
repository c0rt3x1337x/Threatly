
# Sample Articles for Testing

Use these sample articles to populate your Firebase Firestore "articles" collection for testing the Threatly dashboard.

## Sample Article 1
```json
{
  "title": "Critical Automotive Security Vulnerability Discovered in Tesla Model S",
  "content": "A significant security vulnerability has been identified in Tesla Model S vehicles that could potentially allow unauthorized access to vehicle systems. The vulnerability affects the vehicle's infotainment system and could be exploited through the vehicle's Wi-Fi connection. Tesla has been notified and is working on a patch. This discovery highlights the growing importance of automotive cybersecurity as vehicles become more connected.",
  "publishedDate": "2024-01-15T10:30:00Z",
  "link": "https://example.com/tesla-security-vulnerability",
  "flags": {
    "automotive_security": true,
    "samsung_sdi_related": false,
    "adyen_related": false,
    "critical_highlight": true
  }
}
```

## Sample Article 2
```json
{
  "title": "Samsung SDI Battery Technology Breakthrough",
  "content": "Samsung SDI has announced a major breakthrough in battery technology that could revolutionize the electric vehicle industry. The new battery design offers 30% more energy density while maintaining the same safety standards. This development could significantly impact the automotive industry and accelerate the adoption of electric vehicles worldwide.",
  "publishedDate": "2024-01-14T14:20:00Z",
  "link": "https://example.com/samsung-sdi-battery-breakthrough",
  "flags": {
    "automotive_security": false,
    "samsung_sdi_related": true,
    "adyen_related": false,
    "critical_highlight": false
  }
}
```

## Sample Article 3
```json
{
  "title": "Adyen Payment Processing Security Enhancement",
  "content": "Adyen has implemented new security measures to protect against payment fraud and cyber attacks. The company has introduced advanced machine learning algorithms to detect suspicious transactions in real-time. These enhancements will help protect both merchants and consumers from payment-related security threats.",
  "publishedDate": "2024-01-13T09:15:00Z",
  "link": "https://example.com/adyen-security-enhancement",
  "flags": {
    "automotive_security": false,
    "samsung_sdi_related": false,
    "adyen_related": true,
    "critical_highlight": false
  }
}
```

## Sample Article 4
```json
{
  "title": "Major Cybersecurity Breach Affects Multiple Automotive Manufacturers",
  "content": "A coordinated cyber attack has targeted several major automotive manufacturers, compromising sensitive data and potentially affecting vehicle production systems. The attack appears to be state-sponsored and targets connected vehicle infrastructure. Industry experts are calling for immediate action to strengthen automotive cybersecurity protocols.",
  "publishedDate": "2024-01-12T16:45:00Z",
  "link": "https://example.com/automotive-cybersecurity-breach",
  "flags": {
    "automotive_security": true,
    "samsung_sdi_related": false,
    "adyen_related": false,
    "critical_highlight": true
  }
}
```

## Sample Article 5
```json
{
  "title": "Samsung SDI and Adyen Partner for Secure EV Payment Solutions",
  "content": "Samsung SDI and Adyen have announced a strategic partnership to develop secure payment solutions for electric vehicle charging networks. The collaboration will integrate Samsung SDI's battery management systems with Adyen's payment processing technology to create a seamless and secure charging experience for EV owners.",
  "publishedDate": "2024-01-11T11:30:00Z",
  "link": "https://example.com/samsung-adyen-partnership",
  "flags": {
    "automotive_security": true,
    "samsung_sdi_related": true,
    "adyen_related": true,
    "critical_highlight": false
  }
}
```

## Sample Article 6
```json
{
  "title": "New Automotive Security Standards Proposed by Industry Leaders",
  "content": "Leading automotive manufacturers and cybersecurity experts have proposed new industry-wide security standards for connected vehicles. The proposed framework includes mandatory security testing, regular vulnerability assessments, and standardized incident response procedures. This initiative aims to establish a baseline for automotive cybersecurity across the industry.",
  "publishedDate": "2024-01-10T13:20:00Z",
  "link": "https://example.com/automotive-security-standards",
  "flags": {
    "automotive_security": true,
    "samsung_sdi_related": false,
    "adyen_related": false,
    "critical_highlight": false
  }
}
```

## How to Add Sample Data

1. Go to your Firebase Console
2. Navigate to Firestore Database
3. Create a collection named "articles"
4. Add documents with the sample data above
5. Each document will automatically get a unique ID

## Testing Different Scenarios

- **Search Test**: Try searching for "Tesla", "battery", "security", etc.
- **Filter Test**: Use the checkboxes to filter by different categories
- **Critical Incidents**: Look for articles with the red "Critical" badge
- **Combined Filters**: Try multiple filters together
- **Navigation**: Click on article titles to view detail pages 