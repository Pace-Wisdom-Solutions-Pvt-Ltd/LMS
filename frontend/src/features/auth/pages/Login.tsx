// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  GraduationCap,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import logo from "@/assets/pws_logo_new_text.png";
import { useTenant } from "@/context/TenantContext";
import {
  setStoredOrganizations,
  setStoredUser,
  setStoredToken,
  setStoredRefreshToken,
} from "@/lib/auth";
import { ROLE_PATHS } from "@/lib/constants";
import { showToast } from "@/lib/toastApi";
import { isValidEmail } from "@/lib/validation";
import { appendLoginAudit } from "@/lib/auditLog";
import { loginApi } from "@/lib/api/auth";
import { mapBackendRolesToAppRoles, collectRawRoles } from "@/lib/roleMapping";
import type { UserRole, StoredOrganization } from "@/lib/auth";
import Modal from "@/components/ui/Modal";
import ChoiceCard from "@/components/ui/ChoiceCard";

export default function Login() {
  const { tenant } = useTenant();
  const logoSrc = tenant?.logo_url ?? logo;
  const orgName = tenant?.name ?? "LMS";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [roleChoice, setRoleChoice] = useState<null | {
    id: string;
    email: string;
    name: string;
    orgs: StoredOrganization[];
    availableRoles: UserRole[];
    defaultRole: UserRole;
  }>(null);
  // Which step of the "Continue as" flow is showing: pick a role, then (if the
  // user belongs to more than one org) pick which organization to enter.
  const [step, setStep] = useState<"role" | "org">("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const trimmedEmail = email.trim();

  // Commit the chosen role (and, when relevant, the chosen org) and enter the app.
  const finalizeLogin = (role: UserRole, org?: StoredOrganization) => {
    if (!roleChoice) return;
    setStoredUser({
      id: roleChoice.id,
      email: roleChoice.email,
      name: roleChoice.name,
      role,
      roles: roleChoice.availableRoles, // preserve ALL roles
    });
    // The whole app resolves the active org as getStoredOrganizations()[0], so
    // move the picked org to the front while keeping the others available.
    if (org) {
      setStoredOrganizations([
        org,
        ...roleChoice.orgs.filter((o) => o.id !== org.id),
      ]);
    }
    appendLoginAudit(roleChoice.email, true);
    setRoleChoice(null);
    setStep("role");
    setSelectedRole(null);
    const basePath = ROLE_PATHS[role] || "/student";
    window.location.replace(`${basePath}/home`);
  };

  // Opens the "Continue as" modal when the user needs to disambiguate a role
  // and/or an org. Returns true if a choice is required (modal opened), false
  // when the caller should navigate immediately.
  const beginContinueFlow = (choice: {
    id: string;
    email: string;
    name: string;
    orgs: StoredOrganization[];
    availableRoles: UserRole[];
    defaultRole: UserRole;
  }): boolean => {
    if (choice.availableRoles.length > 1) {
      setSelectedRole(null);
      setStep("role");
      setRoleChoice(choice);
      return true;
    }
    if (choice.orgs.length > 1) {
      setSelectedRole(choice.defaultRole);
      setStep("org");
      setRoleChoice(choice);
      return true;
    }
    return false;
  };

  // A role was picked — go on to org selection if that role spans multiple orgs.
  const handlePickRole = (role: UserRole) => {
    if (!roleChoice) return;
    if (roleChoice.orgs.length > 1) {
      setSelectedRole(role);
      setStep("org");
      return;
    }
    finalizeLogin(role, roleChoice.orgs[0]);
  };

  const handlePickOrg = (org: StoredOrganization) => {
    if (!roleChoice || !selectedRole) return;
    finalizeLogin(selectedRole, org);
  };

  // Dismissing the modal falls back to sensible defaults so the user still lands
  // somewhere rather than being stuck on the login screen.
  const handleDismissContinue = () => {
    if (!roleChoice) return;
    if (step === "org" && selectedRole)
      finalizeLogin(selectedRole, roleChoice.orgs[0]);
    else finalizeLogin(roleChoice.defaultRole, roleChoice.orgs[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedEmail || !password.trim()) {
      showToast("Please enter email and password.", "warning");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      showToast("Enter a valid email address.", "warning");
      return;
    }

    setLoading(true);
    try {
      // Call real backend login API
      const res = await loginApi({ email: trimmedEmail, password });

      // Map backend roles (e.g. "superadmin") to frontend roles/paths. Roles may
      // arrive top-level and/or inside each organization membership, so union both.
      const { roles: availableRoles, defaultRole } = mapBackendRolesToAppRoles(
        collectRawRoles(res.user),
      );

      const orgs: StoredOrganization[] = (res.user.organizations ?? []).map(
        (o) => ({
          id: Number(o.org_id ?? o.id),
          name: o.name,
          role: o.role,
          logo: o.logo,
          primary_color: o.primary_color,
          accent_color: o.accent_color,
        }),
      );

      // Save token + organizations now, role selection later
      setStoredOrganizations(orgs);

      console.log("Login: Received response user object:", res.user);
      const userId = res.user.id || res.user.uuid || res.user.user_id;
      console.log("Login: Identified userId as:", userId);

      setStoredUser({
        id: userId,
        email: res.user.email,
        name:
          `${res.user.first_name || ""} ${res.user.last_name || ""}`.trim() ||
          res.user.username,
        role: defaultRole,
        roles: availableRoles, // preserve ALL roles from backend
      });
      setStoredToken(res.access);
      setStoredRefreshToken(res.refresh);

      // Ask the user to disambiguate when they have multiple roles and/or belong
      // to more than one org. Otherwise keep default behavior and navigate now.
      if (
        beginContinueFlow({
          id: userId || "",
          email: res.user.email,
          name:
            `${res.user.first_name || ""} ${res.user.last_name || ""}`.trim() ||
            res.user.username,
          orgs,
          availableRoles,
          defaultRole,
        })
      ) {
        return;
      }

      appendLoginAudit(trimmedEmail, true);
      const basePath = ROLE_PATHS[defaultRole] || "/student";
      window.location.replace(`${basePath}/home`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading;

  const roleLabel = (r: string): string => {
    if (r === "institute_admin") return "Organization Admin";
    if (r === "trainer") return "Trainer";
    return "Student";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="flex flex-col items-center mb-6">
            <img src={logoSrc} alt={orgName} className="h-14 object-contain" />
            {tenant && (
              <p className="text-sm font-semibold text-slate-600 mt-2">
                {orgName}
              </p>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
            Sign in
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="super@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition"
                autoComplete="email"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-teal focus:border-brand-teal outline-none transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-brand-teal hover:text-brand-green font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-teal text-white font-medium hover:opacity-90 focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      {/* "Continue as" — pick a role, then (for multi-org users) an organization */}
      <Modal
        open={!!roleChoice}
        onClose={handleDismissContinue}
        maxWidth="max-w-sm"
      >
        {roleChoice ? (
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-brand-teal mb-3 shadow-lg shadow-brand-teal/25">
                {step === "org" ? (
                  <Building2 className="h-6 w-6 text-white" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-white" />
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {step === "org" ? "Select organization" : "Continue as"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {step === "org" ? (
                  "Choose which organization you want to enter."
                ) : (
                  <>
                    Hi{" "}
                    <span className="font-semibold text-slate-700">
                      {roleChoice.name}
                    </span>
                    ! Pick a workspace to enter.
                  </>
                )}
              </p>
            </div>

            {step === "role" ? (
              /* Role cards */
              <div className="space-y-2.5">
                {roleChoice.availableRoles.map((r) => {
                  const meta: Record<
                    string,
                    {
                      icon: React.ReactNode;
                      color: string;
                      bg: string;
                      border: string;
                      desc: string;
                    }
                  > = {
                    institute_admin: {
                      icon: <Building2 className="h-5 w-5" />,
                      color: "text-brand-teal",
                      bg: "bg-brand-teal/8",
                      border: "border-brand-teal/30",
                      desc: "Manage your organization, staff & courses",
                    },
                    trainer: {
                      icon: <BookOpen className="h-5 w-5" />,
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                      border: "border-amber-200",
                      desc: "Teach courses and track learner progress",
                    },
                    student: {
                      icon: <GraduationCap className="h-5 w-5" />,
                      color: "text-emerald-600",
                      bg: "bg-emerald-50",
                      border: "border-emerald-200",
                      desc: "Access your courses and assessments",
                    },
                  };
                  const m = meta[r] ?? meta.student;
                  return (
                    <ChoiceCard
                      key={r}
                      icon={m.icon}
                      title={roleLabel(r)}
                      description={m.desc}
                      selected={r === roleChoice.defaultRole}
                      color={m.color}
                      bg={m.bg}
                      border={m.border}
                      onClick={() => handlePickRole(r)}
                    />
                  );
                })}
              </div>
            ) : (
              /* Organization cards */
              <div className="space-y-2.5">
                {roleChoice.orgs.map((org, idx) => (
                  <ChoiceCard
                    key={org.id}
                    icon={
                      org.logo ? (
                        <img
                          src={org.logo}
                          alt={org.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )
                    }
                    title={org.name}
                    description={roleLabel(
                      selectedRole ?? roleChoice.defaultRole,
                    )}
                    selected={idx === 0}
                    onClick={() => handlePickOrg(org)}
                  />
                ))}
                {roleChoice.availableRoles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep("role")}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to roles
                  </button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
