import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  MoreHorizontal,
  School,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/** Bosh sahifadagi kabinet maketi (bezak). Ekran o'qigich uchun bitta rasm sifatida e'lon qilinadi. */
export function DashboardPreview() {
  const { t } = useTranslation();
  return (
    <div className="preview-stage" role="img" aria-label={t("dashboardPreview.ariaLabel")}>
      <div className="preview-window" aria-hidden="true">
        <div className="preview-sidebar">
          <div className="preview-mini-logo">
            C<span>·</span>
          </div>
          <LayoutDashboard className="selected" />
          <ClipboardList />
          <CalendarDays />
          <School />
        </div>
        <div className="preview-content">
          <div className="preview-top">
            <span>
              {t("dashboardPreview.overview")} <ChevronDown size={12} />
            </span>
            <span className="preview-avatar">M</span>
          </div>
          <div className="preview-greeting">
            {t("dashboardPreview.greeting")} <span>!</span>
          </div>
          <p>{t("dashboardPreview.subtitle")}</p>
          <div className="preview-main-card">
            <div className="preview-card-head">
              <span>{t("dashboardPreview.practiceName")}</span>
              <MoreHorizontal size={18} />
            </div>
            <div className="preview-card-body">
              <div>
                <small>{t("dashboardPreview.overallProgress")}</small>
                <strong>
                  68<span>%</span>
                </strong>
                <div className="preview-progress">
                  <i />
                </div>
                <small>{t("dashboardPreview.inProgress")}</small>
              </div>
              <div className="preview-ring">
                <span>68%</span>
              </div>
            </div>
          </div>
          <div className="preview-mini-grid">
            <div>
              <span className="mini-icon purple">
                <ClipboardList size={16} />
              </span>
              <small>{t("dashboardPreview.tasks")}</small>
              <strong>12 / 18</strong>
              <span className="mini-foot">
                {t("dashboardPreview.tasksLeft", { n: 6 })} <TrendingUp size={13} />
              </span>
            </div>
            <div>
              <span className="mini-icon green">
                <CalendarDays size={16} />
              </span>
              <small>{t("dashboardPreview.attendance")}</small>
              <strong>{t("dashboardPreview.attendanceDays", { n: 24 })}</strong>
              <span className="mini-foot">
                <Check size={13} /> {t("dashboardPreview.recorded")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="float-status" aria-hidden="true">
        <span className="float-check">
          <Check size={14} />
        </span>
        <div>
          <strong>{t("dashboardPreview.practiceActive")}</strong>
          <small>{t("dashboardPreview.processOngoing")}</small>
        </div>
        <span className="status-dot" />
      </div>
      <div className="float-week" aria-hidden="true">
        <span>4+2</span>
        <small>{t("dashboardPreview.theoryPractice")}</small>
      </div>
    </div>
  );
}
