// src/components/ReportsExportView.tsx
import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Calendar,
  Filter,
  CheckCircle,
  Building,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Task,
  Employee,
  KPI,
  Responsibility,
  PerformanceRankItem,
} from '../types/index.ts';

interface ReportsExportViewProps {
  tasks: Task[];
  employees: Employee[];
  kpis: KPI[];
  responsibilities: Responsibility[];
  rankings: PerformanceRankItem[];
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  tasks,
  employees,
  kpis,
  responsibilities,
  rankings,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<number>(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const reportList = [
    {
      id: 1,
      title: '1. Employee-wise Task Report',
      description: 'Comprehensive roster of all assigned, active, and completed tasks per employee.',
    },
    {
      id: 2,
      title: '2. Monthly KPI Achievement Report',
      description: 'Quantitative target vs actual values, measurement method, and approved scores.',
    },
    {
      id: 3,
      title: '3. Overdue Task Report with Detailed Delay Reasons',
      description: 'Overdue duration (days), written delay explanations, and manager directives.',
    },
    {
      id: 4,
      title: '4. Pending Task Report',
      description: 'All tasks currently in execution or awaiting managerial approval.',
    },
    {
      id: 5,
      title: '5. Employee Responsibility Register',
      description: 'Permanent ongoing job duties, deliverables, frequencies, and measurement SLAs.',
    },
    {
      id: 6,
      title: '6. Monthly Performance Ranking Report',
      description: 'Overall scores, approved KPI percentages, task execution scores, and ranks.',
    },
    {
      id: 7,
      title: '7. Department Performance Summary',
      description: 'Executive overview of completion velocity, on-time rates, and KPI distribution.',
    },
    {
      id: 8,
      title: '8. Task Completion & On-Time Delivery Report',
      description: 'Audit of delivery on or before scheduled deadline dates across personnel.',
    },
    {
      id: 9,
      title: '9. KPI Submission & Approval Status Report',
      description: 'Governance tracking of pending submissions, manager reviews, and approvals.',
    },
    {
      id: 10,
      title: '10. Historical Task Changes & Accountability Audit',
      description: 'Modifications, deadline extensions, and chronological change actions.',
    },
  ];

  // Excel Export Handler
  const exportToExcel = (reportId: number) => {
    setIsExporting(true);
    try {
      let data: any[] = [];
      let filename = 'Renaissance_HR_Report';

      if (reportId === 1) {
        filename = 'Employee_Wise_Task_Report';
        data = tasks.map((t) => ({
          'Task Code': t.taskCode,
          'Task Title': t.title,
          Employee: t.employeeName,
          Designation: t.employeeDesignation,
          Priority: t.priority,
          'Start Date': t.startDate,
          'Original Deadline': t.originalDeadline,
          'Revised Deadline': t.revisedDeadline || 'N/A',
          Status: t.calculatedStatus,
          'Progress %': t.progressPercent,
          'Delay Reason': t.delayReason || 'None',
          'Manager Review': t.managerComments || 'Pending',
        }));
      } else if (reportId === 2) {
        filename = 'Monthly_KPI_Achievement_Report';
        data = kpis.map((k) => ({
          'KPI Code': k.kpiCode,
          Employee: k.employeeName,
          'KPI Title': k.title,
          Target: `${k.targetValue} ${k.unit}`,
          Actual: k.actualValue !== null && k.actualValue !== undefined ? `${k.actualValue} ${k.unit}` : 'Not Submitted',
          'Calculated %': k.calculatedAchievement || 'N/A',
          Weight: k.weight,
          'Approved Achievement %': k.approvedAchievementPercentage || 'Pending',
          'Submission Status': k.submissionStatus,
          'Review Status': k.managerReviewStatus,
        }));
      } else if (reportId === 3) {
        filename = 'Overdue_Tasks_Detailed_Report';
        data = tasks
          .filter((t) => t.isOverdue)
          .map((t) => ({
            'Task Code': t.taskCode,
            'Task Title': t.title,
            Employee: t.employeeName,
            Designation: t.employeeDesignation,
            'Original Deadline': t.originalDeadline,
            'Effective Deadline': t.effectiveDeadline,
            'Days Overdue': t.daysOverdue,
            'Delay Category': t.delayCategory || 'Uncategorized',
            'Delay Justification': t.delayReason || 'Pending written explanation',
            'Manager Comments': t.managerComments || 'Pending review',
          }));
      } else if (reportId === 4) {
        filename = 'Pending_Tasks_Report';
        data = tasks
          .filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
          .map((t) => ({
            'Task Code': t.taskCode,
            Title: t.title,
            Employee: t.employeeName,
            Deadline: t.effectiveDeadline,
            Progress: `${t.progressPercent}%`,
            Status: t.calculatedStatus,
          }));
      } else if (reportId === 5) {
        filename = 'Employee_Responsibility_Register';
        data = responsibilities.map((r) => ({
          'Resp Code': r.responsibilityCode,
          Employee: r.employeeName,
          Title: r.title,
          Description: r.description,
          Category: r.category,
          Frequency: r.frequency,
          Deliverable: r.expectedDeliverable,
          'SLA Criteria': r.measurementCriteria,
          'Linked KPI': r.relatedKpiTitle || 'N/A',
          Status: r.status,
        }));
      } else if (reportId === 6) {
        filename = 'Monthly_Performance_Rankings';
        data = rankings.map((r) => ({
          Rank: r.rank,
          Employee: r.name,
          Designation: r.designation,
          'Assigned Tasks': r.assignedTaskCount,
          'Completed Tasks': r.completedTaskCount,
          'On-Time %': `${r.onTimeCompletionRate}%`,
          'Overdue Tasks': r.overdueTaskCount,
          'Approved KPI Score': r.approvedKpiScore ? `${r.approvedKpiScore}%` : 'Pending',
          'Task Exec Score': `${r.taskExecutionScore}/100`,
          'Overall Score': r.overallScore || 'Pending Evaluation',
          Status: r.statusLabel,
        }));
      } else {
        filename = 'Department_Summary_Report';
        data = employees.map((e) => ({
          'Employee Code': e.employeeCode,
          Name: e.name,
          Designation: e.designation,
          'Total Tasks': e.totalTasks || 0,
          'Completed Tasks': e.completedTasks || 0,
          'Overdue Tasks': e.overdueTasks || 0,
          'On-Time Rate': `${e.onTimeRate || 0}%`,
          'KPI Achievement': e.avgKpiAchievement ? `${e.avgKpiAchievement}%` : 'Pending',
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Export Handler (Corporate Layout with jsPDF & AutoTable)
  const exportToPdf = (reportId: number) => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const currentReport = reportList.find((r) => r.id === reportId) || reportList[0];

      // Corporate Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RENAISSANCE GROUP — HUMAN RESOURCES & OD', 14, 11);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Official Performance Document • Cycle: October 2026 • Timezone: Asia/Dhaka`, 14, 18);

      // Report Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(currentReport.title, 14, 33);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} | Scope: Confidential Departmental Record`, 14, 39);

      let head: string[][] = [];
      let body: any[][] = [];

      if (reportId === 1) {
        head = [['Code', 'Title', 'Assignee', 'Priority', 'Original Deadline', 'Revised', 'Status', 'Progress', 'Delay Reason']];
        body = tasks.map((t) => [
          t.taskCode,
          t.title,
          t.employeeName || 'N/A',
          t.priority,
          t.originalDeadline,
          t.revisedDeadline || '—',
          t.calculatedStatus,
          `${t.progressPercent}%`,
          t.delayReason || 'None',
        ]);
      } else if (reportId === 2) {
        head = [['KPI Code', 'Employee', 'KPI Title', 'Target', 'Actual', 'Weight', 'Approved %', 'Submission Status']];
        body = kpis.map((k) => [
          k.kpiCode,
          k.employeeName || 'N/A',
          k.title,
          `${k.targetValue} ${k.unit}`,
          k.actualValue !== null && k.actualValue !== undefined ? `${k.actualValue} ${k.unit}` : 'Not Submitted',
          `${k.weight}x`,
          k.approvedAchievementPercentage !== null ? `${k.approvedAchievementPercentage}%` : 'Pending',
          k.submissionStatus,
        ]);
      } else if (reportId === 3) {
        head = [['Code', 'Task Title', 'Employee', 'Original Deadline', 'Days Overdue', 'Delay Category', 'Delay Explanation', 'Manager Comment']];
        body = tasks
          .filter((t) => t.isOverdue)
          .map((t) => [
            t.taskCode,
            t.title,
            t.employeeName || 'N/A',
            t.originalDeadline,
            `${t.daysOverdue} days`,
            t.delayCategory || 'General',
            t.delayReason || 'Pending explanation',
            t.managerComments || 'Pending review',
          ]);
      } else if (reportId === 5) {
        head = [['Resp Code', 'Employee', 'Duty Title', 'Category', 'Frequency', 'Deliverable', 'Measurement SLA']];
        body = responsibilities.map((r) => [
          r.responsibilityCode,
          r.employeeName || 'N/A',
          r.title,
          r.category,
          r.frequency,
          r.expectedDeliverable,
          r.measurementCriteria,
        ]);
      } else if (reportId === 6) {
        head = [['Rank', 'Employee', 'Designation', 'Tasks', 'On-Time', 'Overdue', 'Approved KPI', 'Task Exec', 'Overall Score', 'Status']];
        body = rankings.map((r) => [
          String(r.rank),
          r.name,
          r.designation,
          `${r.completedTaskCount}/${r.assignedTaskCount}`,
          `${r.onTimeCompletionRate}%`,
          String(r.overdueTaskCount),
          r.approvedKpiScore ? `${r.approvedKpiScore}%` : 'Pending',
          `${r.taskExecutionScore}/100`,
          r.overallScore ? String(r.overallScore) : 'Pending',
          r.statusLabel,
        ]);
      } else {
        head = [['Code', 'Name', 'Designation', 'Tasks Assigned', 'Tasks Completed', 'Overdue', 'On-Time Delivery', 'Avg KPI Score']];
        body = employees.map((e) => [
          e.employeeCode,
          e.name,
          e.designation,
          String(e.totalTasks || 0),
          String(e.completedTasks || 0),
          String(e.overdueTasks || 0),
          `${e.onTimeRate || 0}%`,
          e.avgKpiAchievement ? `${e.avgKpiAchievement}%` : 'Pending',
        ]);
      }

      autoTable(doc, {
        head: head,
        body: body,
        startY: 44,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(`Page ${data.pageNumber} of ${pageCount} • Renaissance Group HR & OD Internal Record`, 14, 204);
        },
      });

      doc.save(`${currentReport.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err: any) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reporting &amp; Corporate Export Center</h1>
              <p className="text-xs md:text-sm text-slate-500">
                10 Official HR reports with real structured Excel and publication-ready PDF exports
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            Confidential Internal HR Record
          </span>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportList.map((rep) => {
          const isSelected = selectedReportId === rep.id;
          return (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={`p-4 rounded-xl border cursor-pointer transition shadow-xs flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900">{rep.title}</h3>
                  {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rep.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToExcel(rep.id);
                  }}
                  disabled={isExporting}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToPdf(rep.id);
                  }}
                  disabled={isExporting}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF (.pdf)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
