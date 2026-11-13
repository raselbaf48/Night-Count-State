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
  const tdyDisposals = unitDisposals.filter((d) => d.category === 'detTdy');
  const dutyDisposals = unitDisposals.filter((d) => d.category !== 'detTdy');

  const onParadeAirmen = dayState.airmen155.filter(
    (a) => a.status === 'on_parade' && !unitDisposals.some((d) => d.airmanId === a.id)
  );

  const displayVal = (val: number | string) => {
    if (typeof val === 'number') {
      return val === 0 ? '-' : val;
    }
    return val || '-';
  };

  const formatTdyDetail = (detail: string) => {
    const match = detail.match(/^TDY\s*\(([^)]+)\)$/i);
    return match ? match[1].trim() : detail;
  };

  const columns = [
    { key: 'sqnUnit', label: 'Sqn/Unit' },
    { key: 'totalStr', label: 'Total Str' },
    { key: 'detTdy', label: 'Det/Tdy' },
    { key: 'effStr', label: 'Eff Str' },
    { key: 'leave', label: 'Leave' },
    { key: 'course', label: 'Course' },
    { key: 'classExam', label: 'Class/Exam' },
    { key: 'awolDetention', label: 'AWOL/Detention' },
    { key: 'sickReport', label: 'Sick report' },
    { key: 'edExPpgf', label: 'ED/EX PPGF' },
    { key: 'cmhBnsBshQmt', label: 'CMH/ BNS/ BSH/Qmt' },
    { key: 'ucUBoard', label: 'U/C, U/Board' },
    { key: 'officeDuty', label: 'Office Duty' },
    { key: 'aftNiFlgNiDuty', label: 'Aft/Ni flg/Ni Duty' },
    { key: 'gdTfAirfieldDuty', label: 'GD/TF/Airfield Duty' },
    { key: 'driving', label: 'Driving' },
    { key: 'gamesGuardOfHonor', label: 'Games /Guard of Honor' },
    { key: 'totalOutParade', label: 'Total Out Parade' },
    { key: 'onParade', label: 'On Parade' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportDoc = () => {
    const docHTML = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>NT COUNT STATE - 155 UASU BAF</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
          .title { text-align: center; font-weight: bold; font-size: 14px; text-decoration: underline; margin-bottom: 2px; }
          .subtitle { text-align: center; font-weight: bold; font-size: 14px; text-decoration: underline; margin-bottom: 10px; }
          .date { text-align: right; font-weight: bold; font-size: 12px; margin-bottom: 4px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 12px; }
          th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; }
          .underline { text-decoration: underline; font-weight: bold; font-size: 12px; margin-bottom: 8px; }
          ol { margin: 0; padding-left: 18px; }
          li { margin-bottom: 3px; font-size: 12px; }
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
              <td style="font-weight:bold;">155 UASU BAF</td>
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
            <td style="border:none; width:40%; vertical-align:top; text-align:left;">
              <div class="underline">ON PARADE</div>
              <ol>
                ${onParadeAirmen.map((a) => `<li>${a.rank} ${a.name}</li>`).join('')}
              </ol>
            </td>
            <td style="border:none; width:30%; vertical-align:top; text-align:left;">
              <div class="underline">TDY</div>
              <ol>
                ${tdyDisposals.map((d) => `<li>${d.rank} ${d.name} - ${formatTdyDetail(d.detail || d.displayCategory)}</li>`).join('')}
              </ol>
            </td>
            <td style="border:none; width:30%; vertical-align:top; text-align:left;">
              <div class="underline">DUTY ON</div>
              <ol>
                ${dutyDisposals.map((d) => `<li>${d.rank} ${d.name} - ${d.detail || d.displayCategory}</li>`).join('')}
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
        {/* Header */}
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
            <button
              onClick={handleExportDoc}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563eb] hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Download Microsoft Word document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Doc</span>
            </button>

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

        {/* Printable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070d18]">
          <div className="bg-[#0b1424] border border-slate-700/80 rounded-xl p-5 sm:p-7 shadow-2xl max-w-6xl mx-auto print-card text-[12px]">
            {/* Center Titles */}
            <div className="flex flex-col items-center justify-center text-center mb-2">
              <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
                NT COUNT STATE: AIRMEN
              </h2>
              <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
                155 UASU BAF
              </h3>
            </div>

            {/* Date immediately above table top-right corner */}
            <div className="flex justify-end mb-1.5">
              <span className="text-[12px] font-semibold text-slate-200">
                Date: {dayState.formattedDisplayDate}
              </span>
            </div>

            {/* The 20-Column State Table - Autofit & Centered */}
            <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-6">
              <table className="w-full table-auto text-[12px] text-center border-collapse print-table">
                <thead>
                  <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                    {columns.map((col, idx) => (
                      <th
                        key={col.key}
                        className={`border-r last:border-r-0 border-slate-700/80 px-1.5 py-2 font-semibold text-[12px] align-middle text-center whitespace-nowrap ${
                          idx === 0 ? 'px-3' : 'h-36'
                        }`}
                      >
                        {idx === 0 ? (
                          <div className="flex items-center justify-center text-center">
                            {col.label}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full w-full">
                            <div className="writing-vertical text-slate-200 font-medium text-[12px]">
                              {col.label}
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800 text-slate-100 text-[12px]">
                    <td className="px-3 py-2.5 font-bold text-center whitespace-nowrap text-slate-100 border-r border-slate-700/80">
                      155 UASU BAF
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-slate-100 whitespace-nowrap">
                      {displayVal(summarized155.totalStr)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.detTdy)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                      {displayVal(summarized155.effStr)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.leave)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.course)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.classExam)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.awolDetention)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.sickReport)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.edExPpgf)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.cmhBnsBshQmt)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.ucUBoard)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap">
                      {displayVal(summarized155.officeDuty)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.aftNiFlgNiDuty)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.gdTfAirfieldDuty)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.driving)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                      {displayVal(summarized155.gamesGuardOfHonor)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-rose-400 whitespace-nowrap">
                      {displayVal(summarized155.totalOutParade)}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                      {displayVal(summarized155.onParade)}
                    </td>
                    <td className="px-2 py-2 text-slate-300 text-[12px] whitespace-nowrap">
                      {dayState.customRemarks || 'Nil'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Breakdown Lists: On Parade, TDY, and Duty On */}
            <div className="flex flex-row flex-wrap gap-x-12 sm:gap-x-16 gap-y-6 text-[12px] text-slate-200">
              {/* On Parade */}
              <div>
                <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                  ON PARADE
                </h4>

                {onParadeAirmen.length === 0 ? (
                  <div className="text-slate-500 italic">Nil</div>
                ) : (
                  <div className="flex flex-row gap-6 sm:gap-10">
                    {/* Left Sub-Column: 1 to 15 */}
                    <div className="space-y-1">
                      {onParadeAirmen.slice(0, 15).map((airman, idx) => (
                        <div key={airman.id} className="py-0.5 whitespace-nowrap">
                          <span className="text-slate-400 font-medium">{idx + 1}. </span>
                          <span className="text-slate-200 font-medium">
                            {airman.rank} {airman.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Right Sub-Column: 16 onwards */}
                    {onParadeAirmen.length > 15 && (
                      <div className="space-y-1">
                        {onParadeAirmen.slice(15).map((airman, idx) => (
                          <div key={airman.id} className="py-0.5 whitespace-nowrap">
                            <span className="text-slate-400 font-medium">{idx + 16}. </span>
                            <span className="text-slate-200 font-medium">
                              {airman.rank} {airman.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TDY (Separated from Duty On) */}
              <div>
                <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                  TDY
                </h4>

                {tdyDisposals.length === 0 ? (
                  <div className="text-slate-500 italic">Nil</div>
                ) : (
                  <div className="space-y-1">
                    {tdyDisposals.map((disp, idx) => (
                      <div key={disp.id} className="py-0.5 whitespace-nowrap">
                        <span className="text-slate-400 font-medium">{idx + 1}. </span>
                        <span className="text-slate-200 font-medium">
                          {disp.rank} {disp.name} - {formatTdyDetail(disp.detail || disp.displayCategory)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Duty On */}
              <div>
                <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                  DUTY ON
                </h4>

                {dutyDisposals.length === 0 ? (
                  <div className="text-slate-500 italic">Nil</div>
                ) : (
                  <div className="space-y-1">
                    {dutyDisposals.map((disp, idx) => (
                      <div key={disp.id} className="py-0.5 whitespace-nowrap">
                        <span className="text-slate-400 font-medium">{idx + 1}. </span>
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
