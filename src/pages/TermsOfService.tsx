import { LegalDocument, type LegalSection } from "../components/LegalDocument";

/// Radar Systems Limited's terms and conditions, as supplied.
///
/// Reproduced rather than paraphrased, for the same reason as the privacy policy: the version a
/// user is told they have agreed to has to be the version on screen.

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Introduction",
    body: [
      "Welcome to Radar.",
      "These Terms and Conditions (“Terms”) govern your access to and use of Radar’s websites, applications, digital products, features and related services (collectively, the “Platform”).",
      "The Platform is operated by Radar Systems Limited (“Radar”, “we”, “us” or “our”).",
      "Radar is a personal intelligence and learning platform designed to help users discover relevant information, develop useful knowledge, identify opportunities and make more informed decisions.",
      "Our services include Radar Intelligence and Radar Learn. Additional products and features, including career intelligence, opportunity matching and institutional services, may be introduced in the future.",
      "By creating an account, selecting an acceptance option or using a service that requires agreement to these Terms, you agree to be bound by these Terms. If you do not agree, you must not use the relevant service.",
    ],
  },
  {
    heading: "2. Eligibility and User Accounts",
    body: [
      [
        "2.1. You must be legally capable of entering into a binding agreement under the laws applicable to you.",
        "2.2. If you are below the age of legal majority in your jurisdiction, you may use the Platform only where permitted by applicable law and with any required parent or guardian involvement.",
        "2.3. You agree to provide accurate, current and complete information when creating and maintaining your account.",
        "2.4. You are responsible for maintaining the confidentiality of your login credentials and for activities conducted through your account, except where an incident results from Radar’s failure to meet an applicable legal or security obligation.",
        "2.5. You must promptly notify Radar of suspected unauthorised access to your account.",
        "2.6. You must not impersonate another person, misrepresent your identity or qualifications, or create an account using another person’s information without proper authorisation.",
        "2.7. Radar may request reasonable information to verify an account, investigate abuse or comply with applicable law.",
      ],
    ],
  },
  {
    heading: "3. Radar Services",
    body: [
      "Radar may provide the following services, depending on availability, product development and the features offered in your region or subscription plan.",
      "3.1. Radar Intelligence helps users discover, understand and organise information that may be relevant to their interests, goals and activities. Features may include personalised recommendations, information summaries, explanations and other decision-support tools.",
      "3.2. Radar Learn provides educational resources and learning-support features. Depending on availability, these may include tutorials, learning guidance, AI-assisted explanations and tools intended to support independent learning and skills development.",
      "3.3. Personalisation. Radar may use information such as your stated interests, selected preferences and interactions with the Platform to personalise recommendations. Where supported, you may provide feedback to improve relevance, including indicating that content is useful, less useful or irrelevant.",
      "3.4. Future Products and Features. Radar may introduce additional products, including career intelligence, opportunity discovery, skill insights, matching tools and institutional services.",
      "Any feature introduced in the future will be subject to its availability, applicable subscription conditions and any additional terms or privacy notices that apply.",
      "Radar does not guarantee that every feature will be available at all times, in every country or under every subscription plan.",
    ],
  },
  {
    heading: "4. Acceptable Use",
    body: [
      "You agree to use Radar lawfully and responsibly. You must not:",
      [
        "a. use the Platform to violate applicable laws or the rights of others;",
        "b. upload, transmit or distribute unlawful, fraudulent, defamatory, threatening or otherwise prohibited material;",
        "c. attempt to gain unauthorised access to Radar’s systems, accounts, infrastructure or data;",
        "d. interfere with the security, integrity, availability or normal operation of the Platform;",
        "e. introduce malware, malicious code or other harmful material;",
        "f. scrape, harvest, copy or extract data from the Platform through automated means except where expressly authorised by Radar or permitted by applicable law;",
        "g. reverse engineer, decompile or attempt to derive source code, underlying models or proprietary systems, except to the extent applicable law expressly permits such activity;",
        "h. circumvent subscription restrictions, usage limits, security measures or access controls;",
        "i. use Radar to infringe intellectual property, confidentiality, privacy or other legal rights;",
        "j. use Radar’s confidential or proprietary materials to develop a competing service without authorisation, except where such restriction would be unlawful; or",
        "k. misrepresent Radar’s outputs as verified professional advice, official decisions or guaranteed outcomes.",
      ],
      "Nothing in these Terms restricts rights that cannot lawfully be restricted under applicable law.",
    ],
  },
  {
    heading: "5. Artificial Intelligence and Information Accuracy",
    body: [
      [
        "5.1. Radar may use artificial intelligence, machine learning, automated ranking, external information sources and third-party technology providers to deliver its services.",
        "5.2. AI-generated outputs may contain errors, omissions, outdated information, misleading summaries or recommendations that do not fit your circumstances.",
        "5.3. Recommendations reflect the information available to the Platform and the methods used to rank or generate results. They may not reflect every relevant source, perspective or opportunity.",
        "5.4. You should independently verify important information, particularly information concerning education, employment, finances, law, health, safety or other consequential matters.",
        "5.5. Unless expressly agreed in a separate written agreement, Radar does not provide professional legal, medical, financial, psychological or other regulated advice.",
        "5.6. Radar does not guarantee that using the Platform will improve your grades, secure employment, generate income, produce a particular career outcome or lead to any other specific result.",
        "5.7. You remain responsible for decisions and actions you take based on information obtained through Radar.",
      ],
    ],
  },
  {
    heading: "6. Learning and Educational Content",
    body: [
      [
        "6.1. Radar Learn is intended to support learning and understanding. It does not guarantee mastery of a subject, academic success, certification or professional qualification.",
        "6.2. You must comply with the rules of your educational institution, examination body, employer or relevant professional organisation when using Radar.",
        "6.3. You must not use Radar to engage in academic fraud, impersonation, examination misconduct or other dishonest conduct.",
        "6.4. Where Radar links to or incorporates materials from third-party educators, publishers, platforms or content creators, those materials may be subject to separate ownership rights and terms.",
        "6.5. Radar does not necessarily own or independently verify every third-party educational resource made available through the Platform.",
      ],
    ],
  },
  {
    heading: "7. Third-Party Content and Services",
    body: [
      [
        "7.1. Radar may link to, display, retrieve or integrate information and services provided by third parties, including educational platforms, publishers, content providers, AI providers and other technology services.",
        "7.2. Third-party services may have their own terms, privacy policies, access restrictions, fees and availability requirements.",
        "7.3. Radar is not responsible for the independent operation, accuracy, security, availability or policies of third-party services, except to the extent liability cannot lawfully be excluded.",
        "7.4. A recommendation, link or listing does not necessarily constitute an endorsement, verification or guarantee by Radar.",
        "7.5. If a third party changes, restricts or withdraws access to its content or service, the corresponding Radar feature may be affected.",
      ],
    ],
  },
  {
    heading: "8. User Content and Feedback",
    body: [
      [
        "8.1. You retain ownership of content you create and submit to Radar, subject to rights held by third parties.",
        "8.2. You are responsible for ensuring that you have the necessary rights and permissions to submit content to the Platform.",
        "8.3. You grant Radar a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, process, display and otherwise use your submitted content only as reasonably necessary to operate, secure, maintain and provide the services you request, including generating personalised outputs where applicable.",
        "8.4. Radar may use feedback, suggestions and feature requests you voluntarily provide to improve its services without owing compensation, provided that this does not override your ownership rights or authorise unlawful use of personal data.",
        "8.5. Radar will handle personal data in accordance with its Privacy Policy and applicable law. The licence in this section does not independently authorise unrelated use of your personal data.",
        "8.6. You must not submit content that you are legally prohibited from sharing or that infringes another person’s rights.",
      ],
    ],
  },
  {
    heading: "9. Intellectual Property",
    body: [
      [
        "9.1. Radar and its licensors retain ownership of their respective intellectual property rights in the Platform, including its software, interface, branding, design, original content, proprietary datasets, systems and underlying technology.",
        "9.2. Subject to these Terms, Radar grants you a limited, personal, non-exclusive, non-transferable and revocable right to use the Platform for its intended purposes.",
        "9.3. You must not reproduce, commercially exploit, distribute, modify or create derivative works from Radar’s proprietary materials except where authorised by Radar or permitted by law.",
        "9.4. Nothing in these Terms transfers ownership of Radar’s intellectual property to you.",
        "9.5. Third-party content remains subject to the rights and licences of its respective owners.",
      ],
    ],
  },
  {
    heading: "10. Subscriptions, Fees and Payments",
    body: [
      [
        "10.1. Radar may offer free and paid services, including subscription plans, premium features, usage-based services or institutional arrangements.",
        "10.2. Applicable prices, billing periods, plan features, usage limits and payment conditions will be disclosed before you commit to a paid purchase.",
        "10.3. Payments may be processed by third-party payment providers. Their applicable terms may also apply.",
        "10.4. You authorise the applicable payment provider to process payments you have agreed to make. Recurring payments, where offered, will be disclosed before enrolment and may be cancelled in accordance with the displayed cancellation process and applicable law.",
        "10.5. A subscription may renew automatically only where this arrangement is properly disclosed and lawfully authorised.",
        "10.6. You are responsible for applicable taxes, charges or fees disclosed to you before purchase, where legally payable by you.",
        "10.7. Radar may change subscription prices or plan features prospectively by providing reasonable advance notice where required by law. Any price change will apply to future billing periods as permitted by applicable law and the relevant subscription arrangement.",
        "10.8. Refunds and cancellations will be handled in accordance with the applicable purchase terms and mandatory consumer protection laws. Nothing in these Terms removes a refund or cancellation right that the law grants you.",
        "10.9. If a payment fails, Radar may restrict paid features after reasonable notice where appropriate and legally permitted.",
        "10.10. If you purchase through an app store or other distributor, its payment, cancellation and refund procedures may apply in addition to these Terms.",
      ],
    ],
  },
  {
    heading: "11. Availability and Changes",
    body: [
      [
        "11.1. Radar will make reasonable efforts to maintain a useful and secure service but does not guarantee uninterrupted or error-free operation.",
        "11.2. Access may be affected by maintenance, technical failures, network conditions, cyber incidents, third-party outages or circumstances beyond Radar’s reasonable control.",
        "11.3. Radar may update or modify features to improve performance, security, usability or compliance.",
        "11.4. Where a change materially affects a paid service or an existing contractual commitment, Radar will provide notice where required by law or the applicable agreement.",
      ],
    ],
  },
  {
    heading: "12. Suspension and Termination",
    body: [
      [
        "12.1. You may stop using Radar at any time and may request account deletion through available account controls or the contact details published by Radar.",
        "12.2. Radar may restrict, suspend or terminate access where reasonably necessary to address serious or repeated breaches of these Terms, fraud, security risks, unlawful activity or legal obligations.",
        "12.3. Where appropriate and legally permissible, Radar will provide notice and an opportunity to resolve the issue before taking action.",
        "12.4. Radar may discontinue a service where reasonably necessary, subject to applicable law, contractual commitments and any required notice or refund obligations.",
        "12.5. Termination does not remove payment obligations that lawfully accrued before termination.",
        "12.6. Provisions concerning intellectual property, lawful payment obligations, liability, dispute resolution and other provisions intended to survive termination will continue to apply as appropriate.",
        "12.7. Account deletion and the handling of associated personal data will be governed by the Privacy Policy and applicable law.",
      ],
    ],
  },
  {
    heading: "13. Privacy and Data Protection",
    body: [
      "Radar processes personal data in accordance with its Privacy Policy and applicable data protection laws.",
      "The Privacy Policy explains how Radar collects, uses, stores, shares and protects personal data, including information used to personalise recommendations.",
      "Where consent is required, Radar will obtain it through an appropriate mechanism. Acceptance of these Terms does not replace any separate consent required by law.",
    ],
  },
  {
    heading: "14. Disclaimers",
    body: [
      [
        "14.1. To the extent permitted by law, the Platform is provided on an “as available” basis.",
        "14.2. Radar does not warrant that every item of information will be accurate, complete, current, suitable for a particular purpose or available without interruption.",
        "14.3. Personalised recommendations and AI-generated outputs are informational aids, not guarantees of relevance, suitability or success.",
        "14.4. Nothing in these Terms excludes any warranty, consumer right or statutory protection that cannot lawfully be excluded.",
      ],
    ],
  },
  {
    heading: "15. Limitation of Liability",
    body: [
      [
        "15.1. To the extent permitted by applicable law, Radar will not be liable for indirect or consequential losses arising from your use of the Platform, including loss of anticipated opportunities, profits or data, where such exclusion is lawful.",
        "15.2. Radar will not be responsible for decisions you independently make based on AI outputs, third-party information or recommendations, except to the extent liability arises from Radar’s own breach of a legal duty that cannot lawfully be excluded.",
        "15.3. Nothing in these Terms excludes or limits liability for fraud, wilful misconduct, death or personal injury where exclusion is prohibited, or any other liability that applicable law does not permit Radar to exclude or limit.",
        "15.4. Any liability cap applicable to a paid service must be clearly disclosed, reasonable and enforceable under the applicable law. No liability cap in these Terms overrides mandatory statutory rights.",
      ],
    ],
  },
  {
    heading: "16. Indemnity",
    body: [
      "To the extent permitted by applicable law, you are responsible for losses and reasonable costs directly resulting from your unlawful use of the Platform, your infringement of third-party rights or your material breach of these Terms.",
      "This section does not require you to indemnify Radar for losses caused by Radar’s own unlawful conduct, negligence where liability cannot be excluded, or breach of its legal obligations.",
    ],
  },
  {
    heading: "17. Changes to These Terms",
    body: [
      "Radar may update these Terms to reflect changes in its services, business operations, technology or legal obligations.",
      "The updated version will include a revised effective date or last-updated date. Where a change materially affects your rights or obligations, Radar will provide reasonable notice and obtain any acceptance required by law.",
      "Your continued use of the Platform after a change takes effect may constitute acceptance only where this is legally effective. Where affirmative acceptance is required, Radar will request it.",
    ],
  },
  {
    heading: "18. Governing Law and Disputes",
    body: [
      "These Terms are governed by the laws of the Federal Republic of Nigeria, subject to mandatory laws and consumer protections applicable in your jurisdiction.",
      "The parties will first seek to resolve disputes through good-faith discussions.",
      "If a dispute cannot be resolved informally, it may be submitted to a court of competent jurisdiction, subject to applicable law. Nothing in this section removes a consumer’s mandatory right to bring proceedings before another competent court where the law provides that right.",
    ],
  },
  {
    heading: "19. General Provisions",
    body: [
      [
        "19.1. If a provision of these Terms is held unenforceable, the remaining provisions will continue to apply to the extent permitted by law.",
        "19.2. Failure to enforce a provision does not automatically waive the right to enforce it later.",
        "19.3. You may not transfer your account or rights under these Terms without Radar’s consent, except where applicable law provides otherwise.",
        "19.4. Radar may assign its rights and obligations in connection with a lawful business restructuring, merger or transfer, subject to applicable law and any required notice.",
        "19.5. These Terms, together with the Privacy Policy and any additional terms expressly incorporated into a service or purchase, govern your use of the Platform. A separate signed agreement may govern an institutional or enterprise service where it expressly provides otherwise.",
      ],
    ],
  },
  {
    heading: "20. Contact Us",
    body: [
      "For questions, complaints or requests relating to these Terms, contact Radar Systems Limited using the details below.",
      "For privacy and personal data requests, use the contact details designated in Radar’s Privacy Policy.",
      "By using Radar, you acknowledge that you have had an opportunity to read these Terms and agree to them where acceptance is required.",
    ],
  },
];

export function TermsOfService() {
  return (
    <LegalDocument
      title="Terms and Conditions of Use"
      intro="Radar Systems Limited"
      sections={SECTIONS}
      // Marked "[Insert official support email]" and left blank in the supplied document. Shown
      // as outstanding rather than invented.
      contact={[
        { label: "Company", value: "Radar Systems Limited" },
        { label: "Email", value: null },
        { label: "Website", value: null },
      ]}
    />
  );
}
