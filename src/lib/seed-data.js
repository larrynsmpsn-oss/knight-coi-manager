export function buildKnightDemoData() {
  const client = {
    id: 'client-knight',
    name: 'Knight Real Estate',
    slug: 'knight-real-estate',
    timezone: 'America/Chicago',
  };

  const entityTypes = [
    { id: 'entity-type-tenant', clientId: client.id, key: 'tenant', label: 'Tenant' },
    { id: 'entity-type-vendor', clientId: client.id, key: 'vendor', label: 'Vendor' },
  ];

  const properties = [
    { id: 'property-riversouth', clientId: client.id, name: 'Riversouth Building', code: 'RIVERSOUTH' },
    { id: 'property-westgate', clientId: client.id, name: 'Westgate Office Center', code: 'WESTGATE' },
  ];

  const entities = [
    {
      id: 'entity-lone-star',
      clientId: client.id,
      entityTypeId: 'entity-type-tenant',
      propertyId: 'property-riversouth',
      name: 'Lone Star Therapy, LLC',
      primaryEmail: 'ops@lonestartherapy.com',
      alternateEmails: ['broker@lonestarinsurance.com'],
    },
    {
      id: 'entity-aurora',
      clientId: client.id,
      entityTypeId: 'entity-type-tenant',
      propertyId: 'property-westgate',
      name: 'Aurora Wealth Partners',
      primaryEmail: 'office@aurorawealth.com',
      alternateEmails: [],
    },
    {
      id: 'entity-apex',
      clientId: client.id,
      entityTypeId: 'entity-type-vendor',
      propertyId: null,
      name: 'Apex Mechanical Services',
      primaryEmail: 'service@apexmechanical.com',
      alternateEmails: ['certs@apexmechanical.com'],
    },
  ];

  const certificates = [
    {
      id: 'cert-lone-star-2025',
      clientId: client.id,
      entityId: 'entity-lone-star',
      insuredName: 'Lone Star Therapy, LLC',
      expirationDate: '2025-12-31',
      policyNumber: 'GL-1001',
      isActive: false,
    },
    {
      id: 'cert-apex-2026',
      clientId: client.id,
      entityId: 'entity-apex',
      insuredName: 'Apex Mechanical Services',
      expirationDate: '2026-09-30',
      policyNumber: 'APEX-77',
      isActive: true,
    },
  ];

  const sampleMessages = [
    {
      id: 'msg-1',
      fromEmail: 'broker@lonestarinsurance.com',
      fromName: 'Broker Team',
      subject: 'Updated COI for Lone Star Therapy',
      bodyText:
        'Attached is the updated certificate for Lone Star Therapy. Please replace the prior version on file.',
      receivedAt: '2026-10-20T15:30:00Z',
      attachments: [
        {
          id: 'att-1',
          filename: 'LoneStarTherapy-COI.pdf',
          contentType: 'application/pdf',
          text: [
            'CERTIFICATE OF LIABILITY INSURANCE',
            'INSURED: Lone Star Therapy, LLC',
            'CERTIFICATE HOLDER: Knight Real Estate',
            'PRODUCER: Hill Country Insurance',
            'POLICY NUMBER: GL-1001',
            'EFFECTIVE DATE: 01/01/2026',
            'EXPIRATION DATE: 12/31/2026',
          ].join('\n'),
        },
      ],
    },
    {
      id: 'msg-2',
      fromEmail: 'hello@unknownbroker.com',
      fromName: 'Unknown Broker',
      subject: 'Certificate attached',
      bodyText: 'Please see attached certificate.',
      receivedAt: '2026-10-21T12:00:00Z',
      attachments: [
        {
          id: 'att-2',
          filename: 'certificate.pdf',
          contentType: 'application/pdf',
          text: [
            'CERTIFICATE OF LIABILITY INSURANCE',
            'INSURED: Summit Wellness Group',
            'CERTIFICATE HOLDER: Knight Real Estate',
            'PRODUCER: Broker Unknown',
            'POLICY NUMBER: SWG-9',
            'EFFECTIVE DATE: 10/01/2026',
            'EXPIRATION DATE: 10/01/2027',
          ].join('\n'),
        },
      ],
    },
  ];

  return { client, entityTypes, properties, entities, certificates, sampleMessages };
}
