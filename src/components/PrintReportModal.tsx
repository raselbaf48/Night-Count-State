import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { DayState } from '../types/nightCount';
import { calculate155SummarizedRow } from '../utils/storage';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayState: DayState;
  activeTab?: '155 UASU BAF' | 'Flying Wing';
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  dayState,
}) => {
  if (!isOpen) return null;

  const summarized155 = calculate155SummarizedRow(dayState);

  const unitDisposals = dayState.disposals.filter((d) => d.unit === '155 UASU BAF');
  const onParadeAirmen = dayState.airmen155.filter(
    (a) => a.status === 'on_parade' && !unitDisposals.some((d) => d.airmanId === a.id)
  );

  const displayVal = (val: number | string) => {
    if (typeof val === 'number') {
      return val === 0 ? '-' : val;
    }
    return val || '-';
  };

  const columns = [
    { key: 'sqnUnit', label: 'Sqn/Unit', width: 'min-w-[120px]' },
    { key: 'totalStr', label: 'Total Str', width: 'min-w-[42px]' },
    { key: 'detTdy', label: 'Det/Tdy', width: 'min-w-[40px]' },
    { key: 'effStr', label: 'Eff Str', width: 'min-w-[42px]' },
    { key: 'leave', label: 'Leave', width: 'min-w-[36px]' },
    { key: 'course', label: 'Course', width: 'min-w-[36px]' },
    { key: 'classExam', label: 'Class/Exam', width: 'min-w-[38px]' },
    { key: 'awolDetention', label: 'AWOL/Detention', width: 'min-w-[38px]' },
    { key: 'sickReport', label: 'Sick report', width: 'min-w-[38px]' },
    { key: 'edExPpgf', label: 'ED/ EX PPGF', width: 'min-w-[38px]' },
    { key: 'cmhBnsBshQmt', label: 'CMH/ BNS/ BSH/Qmt', width: 'min-w-[44px]' },
    { key: 'ucUBoard', label: 'U/C, U/Board', width: 'min-w-[38px]' },
    { key: 'officeDuty', label: 'Office Duty', width: 'min-w-[38px]' },
    { key: 'aftNiFlgNiDuty', label: 'Aft/Ni flg/Ni Duty', width: 'min-w-[40px]' },
    { key: 'gdTfAirfieldDuty', label: 'GD/TF/Airfield Duty', width: 'min-w-[42px]' },
    { key: 'driving', label: 'Driving', width: 'min-w-[36px]' },
    { key: 'gamesGuardOfHonor', label: 'Games /Guard of Honor', width: 'min-w-[42px]' },
    { key: 'totalOutParade', label: 'Total Out Parade', width: 'min-w-[44px]' },
    { key: 'onParade', label: 'On Parade', width: 'min-w-[44px]' },
    { key: 'remarks', label: 'Remarks', width: 'min-w-[60px]' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportDoc = () => {
    let docHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>NT COUNT STATE - 155 UASU BAF</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
          .title { text-align: center; font-weight: bold; font-size: 13pt; text-decoration: underline; margin-bottom: 2px; }
          .subtitle { text-align: center; font-weight: bold; font-size: 13pt; text-decoration: underline; margin-bottom: 12px; }
          .date { text-align: right; font-weight: bold; font-size: 10pt; margin-bottom: 6px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 9pt; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; }
          .text-left { text-align: left; }
          .underline { text-decoration: underline; font-weight: bold; font-size: 11pt; margin-bottom: 8px; }
          .section-grid { display: flex; width: 100%; margin-top: 15px; }
          .col { width: 50%; vertical-align: top; }
          ol { margin: 0; padding-left: 20px; }
          li { margin-bottom: 3px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="title">NT COUNT STATE: AIRMEN</div>
        <div class="subtitle">155 UASU BAF</div>
        <div class="date">Date: ${dayState.formattedDisplayDate}</div>

        <table>
          <thead>
            <tr>
              ${columns.map((c) => `<th>${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left" style="font-weight:bold;">155 UASU BAF</td>
              <td>${summarized155.totalStr}</td>
              <td>${summarized155.detTdy || '-'}</td>
              <td style="font-weight:bold;">${summarized155.effStr}</td>
              <td>${summarized155.leave || '-'}</td>
              <td>${summarized155.course || '-'}</td>
              <td>${summarized155.classExam || '-'}</td>
              <td>${summarized155.awolDetention || '-'}</td>
              <td>${summarized155.sickReport || '-'}</td>
              <td>${summarized155.edExPpgf || '-'}</td>
              <td>${summarized155.cmhBnsBshQmt || '-'}</td>
              <td>${summarized155.ucUBoard || '-'}</td>
              <td>${summarized155.officeDuty || '-'}</td>
              <td>${summarized155.aftNiFlgNiDuty || '-'}</td>
              <td>${summarized155.gdTfAirfieldDuty || '-'}</td>
              <td>${summarized155.driving || '-'}</td>
              <td>${summarized155.gamesGuardOfHonor || '-'}</td>
              <td style="font-weight:bold;">${summarized155.totalOutParade}</td>
              <td style="font-weight:bold;">${summarized155.onParade}</td>
              <td>${dayState.customRemarks || 'Nil'}</td>
            </tr>
          </tbody>
        </table>

        <table style="border:none; width:100%;">
          <tr>
            <td style="border:none; width:50%; vertical-align:top; text-align:left;">
              <div class="underline">On Parade (${onParadeAirmen.length})</div>
              <ol>
                ${onParadeAirmen.map((a) => `<li>${a.rank} ${a.name}</li>`).join('')}
              </ol>
            </td>
            <td style="border:none; width:50%; vertical-align:top; text-align:left;">
              <div class="underline">Duty On (${unitDisposals.length})</div>
              <ol>
                ${unitDisposals.map((d) => `<li>${d.rank} ${d.name} - ${d.detail || d.displayCategory}</li>`).join('')}
              </ol>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docHTML], {
      type: 'application/msword',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NT_Count_State_155_UASU_${dayState.date}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-slate-700/80 w-full max-w-6xl max-h-[95vh] flex flex-col rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header matching image_8a684474.png */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1b30] border-b border-slate-700/80 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100">
                Print Preview: 155 UASU BAF
              </h3>
              <p className="text-[11px] text-slate-400">Review document before printing</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export Doc Button */}
            <button
              onClick={handleExportDoc}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563eb] hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Download Microsoft Word document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Doc</span>
            </button>

            {/* Official Export / Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Print document to printer or PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Official Export / Print</span>
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area matching image_8a684474.png */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070d18]">
          <div className="bg-[#0b1424] border border-slate-700/80 rounded-xl p-5 sm:p-7 shadow-2xl max-w-5xl mx-auto print-card">
            {/* Center Titles & Date */}
            <div className="flex flex-col items-center justify-center text-center relative mb-5">
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
                NT COUNT STATE: AIRMEN
              </h2>
              <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
                155 UASU BAF
              </h3>

              <div className="w-full flex justify-end mt-2 sm:mt-0 sm:absolute sm:right-0 sm:bottom-0">
                <span className="text-xs font-semibold text-slate-200">
                  Date: {dayState.formattedDisplayDate}
                </span>
              </div>
            </div>

            {/* The 20-Column State Table */}
            <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-6">
              <table className="w-full text-xs text-center border-collapse print-table">
                <thead>
                  <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                    {columns.map((col, idx) => (
                      <th
                        key={col.key}
                        className={`border-r border-slate-700/80 p-1 font-semibold text-[11px] align-bottom pb-2 ${col.width} ${
                          idx === 0 ? 'text-left pl-3 align-middle py-3' : 'h-36'
                        }`}
                      >
                        {idx === 0 ? (
                          col.label
                        ) : (
                          <div className="writing-vertical mx-auto max-h-32 text-slate-200 font-medium">
                            {col.label}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800 text-slate-100">
                    <td className="p-2.5 font-bold text-left pl-3 text-slate-100 border-r border-slate-700/80 text-xs">
                      155 UASU BAF
                    </td>
                    <td className="p-2 border-r border-slate-700/80 font-bold text-slate-100">
                      {displayVal(summarized155.totalStr)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.detTdy)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 font-bold text-emerald-400">
                      {displayVal(summarized155.effStr)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.leave)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.course)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.classExam)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.awolDetention)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.sickReport)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.edExPpgf)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.cmhBnsBshQmt)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.ucUBoard)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 font-semibold text-amber-300">
                      {displayVal(summarized155.officeDuty)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.aftNiFlgNiDuty)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.gdTfAirfieldDuty)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.driving)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 text-slate-400">
                      {displayVal(summarized155.gamesGuardOfHonor)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 font-bold text-rose-400">
                      {displayVal(summarized155.totalOutParade)}
                    </td>
                    <td className="p-2 border-r border-slate-700/80 font-bold text-emerald-400 text-sm">
                      {displayVal(summarized155.onParade)}
                    </td>
                    <td className="p-2 text-slate-300 text-xs">
                      {dayState.customRemarks || 'Nil'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Breakdown Lists matching image_8a684474.png */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-200">
              {/* Left Column: On Parade (underlined title) */}
              <div>
                <h4 className="font-bold text-xs text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                  On Parade
                </h4>

                {onParadeAirmen.length === 0 ? (
                  <div className="text-slate-500 italic">No airmen on parade</div>
                ) : (
                  <div className="flex flex-row gap-4 sm:gap-6">
                    {/* Left Sub-Column: 1 to 15 */}
                    <div className="flex-1 space-y-1">
                      {onParadeAirmen.slice(0, 15).map((airman, idx) => (
                        <div key={airman.id} className="flex items-center gap-1.5 py-0.5">
                          <span className="text-slate-400 w-5 text-right font-medium">
                            {idx + 1}.
                          </span>
                          <span className="text-slate-200 font-medium">
                            {airman.rank} {airman.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Right Sub-Column: 16 onwards */}
                    <div className="flex-1 space-y-1">
                      {onParadeAirmen.slice(15).map((airman, idx) => (
                        <div key={airman.id} className="flex items-center gap-1.5 py-0.5">
                          <span className="text-slate-400 w-5 text-right font-medium">
                            {idx + 16}.
                          </span>
                          <span className="text-slate-200 font-medium">
                            {airman.rank} {airman.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Duty On (underlined title) */}
              <div>
                <h4 className="font-bold text-xs text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                  Duty On
                </h4>

                {unitDisposals.length === 0 ? (
                  <div className="text-slate-500 italic">No airmen on duty</div>
                ) : (
                  <div className="space-y-1">
                    {unitDisposals.map((disp, idx) => (
                      <div key={disp.id} className="flex items-center gap-1.5 py-0.5">
                        <span className="text-slate-400 w-4 text-right font-medium">
                          {idx + 1}.
                        </span>
                        <span className="text-slate-200 font-medium">
                          {disp.rank} {disp.name} - {disp.detail || disp.displayCategory}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
