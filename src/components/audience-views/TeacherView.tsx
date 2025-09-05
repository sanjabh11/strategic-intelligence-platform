// Teacher View Component
// Educational materials with lesson outline, grading rubric, and student handouts

import React from 'react';
import { Presentation, ClipboardList, BookOpen, Download, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { AudienceViewProps, TeacherViewData, SourceCitation } from '../../types/audience-views';

const TeacherView: React.FC<AudienceViewProps> = ({
  analysisData,
  onSourceClick,
  isLoading = false,
  error
}) => {
  const handleDownload = (url?: string, filename?: string) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'handout';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-red-500/20">
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          <span className="ml-2 text-slate-300">Loading teacher materials...</span>
        </div>
      </div>
    );
  }

  if (!analysisData || analysisData.audience !== 'teacher') {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-yellow-500/20">
        <div className="text-yellow-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          No teacher analysis data available
        </div>
      </div>
    );
  }

  const teacherData = analysisData.data as TeacherViewData;

  const renderLessonOutline = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <Presentation className="w-6 h-6 mr-3 text-orange-400" />
        <h2 className="text-xl font-semibold text-slate-200">Lesson Outline</h2>
      </div>

      <div className="space-y-4">
        {teacherData.lesson_outline.map((section, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-slate-200">{section.section}</h3>
              <div className="flex items-center text-sm text-slate-400">
                <Clock className="w-4 h-4 mr-1" />
                {section.duration}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-slate-300 text-sm mb-2">Objectives</h4>
                <ul className="space-y-1">
                  {section.objectives.map((objective, objIndex) => (
                    <li key={objIndex} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-4 h-4 bg-orange-500/20 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      </div>
                      <span className="text-slate-300 text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-slate-300 text-sm mb-2">Activities</h4>
                <ul className="space-y-1">
                  {section.activities.map((activity, actIndex) => (
                    <li key={actIndex} className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      </div>
                      <span className="text-slate-300 text-sm">{activity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGradingRubric = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <ClipboardList className="w-6 h-6 mr-3 text-green-400" />
        <h2 className="text-xl font-semibold text-slate-200">Grading Rubric</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left p-3 text-slate-300 font-medium">Criteria</th>
              <th className="text-left p-3 text-slate-300 font-medium">Excellent</th>
              <th className="text-left p-3 text-slate-300 font-medium">Good</th>
              <th className="text-left p-3 text-slate-300 font-medium">Needs Improvement</th>
              <th className="text-center p-3 text-slate-300 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {teacherData.grading_rubric.map((criteria, index) => (
              <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                <td className="p-3 text-slate-200 font-medium">{criteria.criteria}</td>
                <td className="p-3 text-slate-300 text-sm">{criteria.excellent}</td>
                <td className="p-3 text-slate-300 text-sm">{criteria.good}</td>
                <td className="p-3 text-slate-300 text-sm">{criteria.needs_improvement}</td>
                <td className="p-3 text-center">
                  <span className="inline-flex items-center px-2 py-1 bg-green-500/20 text-green-300 rounded text-sm font-mono">
                    {criteria.points}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentHandouts = () => (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-6">
        <BookOpen className="w-6 h-6 mr-3 text-purple-400" />
        <h2 className="text-xl font-semibold text-slate-200">Student Handouts</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teacherData.student_handouts.map((handout, index) => (
          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-slate-200">{handout.title}</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                handout.format === 'pdf' ? 'bg-red-500/20 text-red-300' :
                handout.format === 'docx' ? 'bg-blue-500/20 text-blue-300' :
                'bg-green-500/20 text-green-300'
              }`}>
                {handout.format.toUpperCase()}
              </span>
            </div>

            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              {handout.content}
            </p>

            {handout.download_url && (
              <button
                onClick={() => handleDownload(handout.download_url, `${handout.title}.${handout.format}`)}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSources = () => {
    if (!teacherData.sources || teacherData.sources.length === 0) return null;

    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center mb-4">
          <ExternalLink className="w-6 h-6 mr-3 text-orange-400" />
          <h2 className="text-xl font-semibold text-slate-200">Educational Sources</h2>
        </div>
        <div className="space-y-3">
          {teacherData.sources.map((source, index) => (
            <button
              key={source.id}
              onClick={() => onSourceClick?.(source.id)}
              className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-orange-500 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center text-xs text-orange-400">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-orange-300 truncate">{source.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2 mt-1">{source.snippet}</p>
                  {source.url && (
                    <p className="text-slate-500 text-xs mt-1 truncate">{source.url}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderLessonOutline()}
      {renderGradingRubric()}
      {renderStudentHandouts()}
      {renderSources()}
    </div>
  );
};

export default TeacherView;