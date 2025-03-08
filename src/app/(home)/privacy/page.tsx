import { title } from "@/components/primitives";

export default function PrivacyPolicyPage() {
  return (
    <div className="text-left">
      <h1 className={title({ class: "mb-6" })}>Privacy Policy</h1>

      <h2 className="text-xl font-bold mb-3 mt-6">Introduction</h2>
      <p className="mb-4">
        At MindMapFlow, we respect your privacy and are committed to protecting
        your personal data. This privacy policy explains how we collect, use,
        and safeguard your information when you use our service.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">Information We Collect</h2>
      <p className="mb-2">We collect the following types of information:</p>
      <ul className="list-disc pl-5 mb-4">
        <li>Account information (email address) when you register</li>
        <li>Usage data related to how you interact with our application</li>
        <li>Content you create and store using our mind mapping tools</li>
        <li>
          Technical information such as your IP address, browser type, and
          device information
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-3 mt-6">
        How We Use Your Information
      </h2>
      <p className="mb-2">
        We use your information for the following purposes:
      </p>
      <ul className="list-disc pl-5 mb-4">
        <li>To provide and maintain our service</li>
        <li>To notify you about changes to our service</li>
        <li>To provide customer support</li>
        <li>
          To gather analysis or valuable information to improve our service
        </li>
        <li>To monitor the usage of our service</li>
        <li>To detect, prevent and address technical issues</li>
      </ul>

      <h2 className="text-xl font-bold mb-3 mt-6">Data Security</h2>
      <p className="mb-4">
        The security of your data is important to us. We strive to use
        commercially acceptable means to protect your personal information, but
        we cannot guarantee its absolute security. Your data is stored securely
        in Azure Blob Storage with appropriate access controls.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">Sharing Your Information</h2>
      <p className="mb-4">
        We do not sell, trade, or rent your personal identification information
        to others. We may share generic aggregated demographic information not
        linked to any personal identification information regarding visitors and
        users with our business partners and trusted affiliates for the purposes
        outlined above.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">Third-party Services</h2>
      <p className="mb-4">
        We may use third-party services, such as Google Analytics and Microsoft
        Application Insights, to monitor and analyze the use of our service.
        These third parties have their own privacy policies addressing how they
        use such information.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">
        Changes to This Privacy Policy
      </h2>
      <p className="mb-4">
        We may update our Privacy Policy from time to time. We will notify you
        of any changes by posting the new Privacy Policy on this page and
        updating the &quot;Last updated&quot; date. You are advised to review
        this Privacy Policy periodically for any changes.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">Contact Us</h2>
      <p className="mb-4">
        If you have any questions about this Privacy Policy, please contact
        Tommi through LinkedIn:{" "}
        <a
          className="text-white underline"
          href="https://www.linkedin.com/in/tlaukkanen/"
        >
          https://www.linkedin.com/in/tlaukkanen/
        </a>
      </p>

      <p className="text-sm text-gray-400 mt-8">Last updated: March 2025</p>
    </div>
  );
}
