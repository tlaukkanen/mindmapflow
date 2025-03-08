import { title } from "@/components/primitives";

export default function TermsOfServicePage() {
  return (
    <div className="text-left">
      <h1 className={title({ class: "mb-6" })}>Terms of Service</h1>

      <h2 className="text-xl font-bold mb-3 mt-6">1. Introduction</h2>
      <p className="mb-4">
        Welcome to MindMapFlow. By accessing our website or using our services,
        you agree to these Terms of Service. Please read them carefully. If you
        do not agree with these terms, please do not use our services.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">2. Description of Service</h2>
      <p className="mb-4">
        MindMapFlow provides tools for creating, editing, and sharing mind maps
        and visual diagrams. Our services include both free and paid features as
        described on our website. We reserve the right to modify, suspend, or
        discontinue any part of our services at any time.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">3. User Accounts</h2>
      <p className="mb-4">
        Some features of our services require you to create an account. You are
        responsible for maintaining the confidentiality of your account
        information and for all activities that occur under your account. You
        agree to notify us immediately of any unauthorized use of your account.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">4. User Content</h2>
      <p className="mb-4">
        You retain ownership of any content you create using our services. By
        using our services, you grant us a license to host, store, and display
        your content as necessary to provide the service. You are solely
        responsible for the content you create and share through our services.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">5. Acceptable Use</h2>
      <p className="mb-2">You agree not to use our services to:</p>
      <ul className="list-disc pl-5 mb-4">
        <li>Violate any laws or regulations</li>
        <li>Infringe on the rights of others</li>
        <li>Distribute malicious software or harmful content</li>
        <li>Interfere with or disrupt our services</li>
        <li>
          Attempt to gain unauthorized access to our systems or user accounts
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-3 mt-6">6. Intellectual Property</h2>
      <p className="mb-4">
        The MindMapFlow name, logos, and all related graphics, design elements,
        and user interfaces are our trademarks and intellectual property. You
        may not use our trademarks without our prior written permission.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">
        7. Limitation of Liability
      </h2>
      <p className="mb-4">
        To the fullest extent permitted by law, MindMapFlow shall not be liable
        for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits or revenues, whether incurred directly
        or indirectly, or any loss of data, use, goodwill, or other intangible
        losses resulting from your use of our services.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">
        8. Disclaimer of Warranties
      </h2>
      <p className="mb-4">
        Our services are provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind, either express or implied, including,
        but not limited to, implied warranties of merchantability, fitness for a
        particular purpose, or non-infringement.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">9. Changes to Terms</h2>
      <p className="mb-4">
        We reserve the right to modify these Terms of Service at any time. We
        will provide notice of significant changes by posting the updated terms
        on our website. Your continued use of our services after such changes
        constitutes your acceptance of the new terms.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">10. Governing Law</h2>
      <p className="mb-4">
        These terms shall be governed by the laws of the jurisdiction in which
        MindMapFlow operates, without regard to its conflict of law provisions.
      </p>

      <h2 className="text-xl font-bold mb-3 mt-6">11. Contact Us</h2>
      <p className="mb-4">
        If you have any questions about these Terms of Service, please contact
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
