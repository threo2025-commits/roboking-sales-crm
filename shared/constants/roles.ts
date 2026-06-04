export const CRM_ROLES = ['OWNER', 'MANAGER', 'PA_ADMIN_ASSISTANT', 'EMPLOYEE'] as const;
export type CrmRole = (typeof CRM_ROLES)[number];
