// SnapPe AI Lead Scorer — Dashboard Integration
// Loaded via angular.json scripts array (not component HTML)

(function () {

  var AI_SCORER_URL = 'https://hazily-margarita-slouchy.ngrok-free.dev';

  // ── Wait for the dashboard app to load, then patch openDetail ─────────────
  var _attempts = 0;
  function patchOpenDetail() {
    if (typeof window.openDetail === 'function') {
      var _orig = window.openDetail;
      window.openDetail = function (lead) {
        window.currentLead = lead;
        resetAiScoreTab();
        return _orig.apply(this, arguments);
      };
      console.log('[AI Scorer] openDetail patched successfully');
    } else {
      _attempts++;
      if (_attempts < 40) {
        setTimeout(patchOpenDetail, 500);
      } else {
        console.warn('[AI Scorer] Could not patch openDetail after 20s');
      }
    }
  }

  // Start patching after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchOpenDetail);
  } else {
    setTimeout(patchOpenDetail, 500);
  }

  // ── Reset AI tab when a new lead is opened ────────────────────────────────
  function resetAiScoreTab() {
    var el = document.getElementById('aiScoreContent');
    if (!el) return;
    el.innerHTML = [
      '<div class="ai-score-intro">',
      '  <div class="ai-intro-icon">🤖</div>',
      '  <p>Click below to analyse this lead using AI and get a quality score,',
      '     key reasons, and a recommended next action.</p>',
      '  <button class="btn btn-primary" onclick="runAiScore()">Analyse Lead Quality</button>',
      '</div>'
    ].join('');
  }

  // ── Build params from lead object ─────────────────────────────────────────
  function buildLeadParams(lead) {
    function col(displayName) {
      var cols = lead.customColumns || [];
      for (var i = 0; i < cols.length; i++) {
        if (cols[i].displayName &&
            cols[i].displayName.trim().toLowerCase() === displayName.toLowerCase()) {
          return cols[i].value || null;
        }
      }
      return null;
    }

    return {
      lead_id:              lead.id                                           || null,
      customer_name:        lead.customerName                                 || null,
      email:                lead.email                                        || null,
      city:                 lead.city                                         || null,
      state:                lead.state                                        || null,
      country_code:         lead.countryCode                                  || null,
      lead_source:          (lead.leadSource && lead.leadSource.sourceName)   || null,
      created_on:           lead.createdOn                                    || null,
      lead_status:          (lead.leadStatus && lead.leadStatus.statusName)   || null,
      total_calls:          lead.totalCalls                                   || 0,
      no_of_follow_ups:     lead.noOfFollowUps                                || 0,
      whatsapp_count:       lead.whatsappCount                                || 0,
      follow_up_date:       lead.followUpDate                                 || null,
      is_assigned:          !!lead.assignedTo,
      last_call_on:         lead.lastCallOn                                   || null,
      potential_deal_value: lead.potentialDealValue                           || null,
      actual_deal_value:    lead.actualDealValue                              || null,
      company_size:         col('Company Size'),
      job_title:            col('Job Title'),
      business_challenges:  col('Business Challenges'),
      using_any_crm:        col('Using Any CRM'),
      customer_type:        col('Customer Type'),
      approval:             col('Approval'),
      project_details:      col('Project Details'),
      requirement:          col('Requirement')
    };
  }

  // ── Render score result ───────────────────────────────────────────────────
  function renderAiScore(result) {
    var labelClass  = result.label.toLowerCase();
    var confPct     = Math.round(result.confidence * 100);
    var emoji       = labelClass === 'hot' ? '🔥' : labelClass === 'warm' ? '☀️' : '❄️';

    var reasonsHtml = (result.reasons || []).map(function (r) {
      return '<li>' + r + '</li>';
    }).join('');

    document.getElementById('aiScoreContent').innerHTML = [
      '<div class="ai-score-result">',

      '<div class="ai-score-badge ' + labelClass + '">',
      emoji + ' ' + result.label + ' — ' + result.score + '/100',
      '</div>',

      '<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">',
      '<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:#f3f0ff;color:#5b21b6;font-weight:600">',
      '📊 Rule-based: ' + result.score_quality + '</span>',
      '<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:#ecfdf5;color:#065f46;font-weight:600">',
      '🤖 ML Model: ' + result.ml_quality + '</span>',
      '<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:#fff7ed;color:#9a3412;font-weight:600">',
      '🎯 Conversion: ' + result.conversion_probability + '%</span>',
      '</div>',

      '<div class="ai-score-meta">Model Confidence: ' + confPct + '%</div>',
      '<div class="ai-confidence-bar">',
      '<div class="ai-confidence-bar-inner" style="width:' + confPct + '%"></div>',
      '</div>',

      '<div class="ai-score-section-title">Why this score</div>',
      '<ul class="ai-reason-list">' + reasonsHtml + '</ul>',

      '<div class="ai-action-box">',
      '💡 <strong>Recommended action:</strong> ' + result.recommended_action,
      '</div>',

      '<button class="btn btn-ghost" onclick="runAiScore()" style="margin-top:14px;font-size:12px">',
      '↻ Re-analyse</button>',

      '</div>'
    ].join('');
  }

  // ── Call the Python API ───────────────────────────────────────────────────
  window.runAiScore = function () {
    var lead = window.currentLead;
    if (!lead) {
      document.getElementById('aiScoreContent').innerHTML =
        '<p style="color:#888;font-size:13px;padding:16px 0">No lead loaded. Please open a lead first.</p>';
      return;
    }

    document.getElementById('aiScoreContent').innerHTML = [
      '<div class="ai-score-loading">',
      '<div class="ai-spinner">🤖</div>',
      '<div style="font-size:13px">Analysing lead quality…</div>',
      '</div>'
    ].join('');

    fetch(AI_SCORER_URL + '/score-lead', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(buildLeadParams(lead))
    })
    .then(function (resp) {
      if (!resp.ok) throw new Error('Server error: ' + resp.status);
      return resp.json();
    })
    .then(function (result) {
      renderAiScore(result);
      if (window.currentLead) {
        window.currentLead.aiScore = result.score;
        window.currentLead.aiLabel = result.label;
      }
    })
    .catch(function (err) {
      document.getElementById('aiScoreContent').innerHTML = [
        '<div class="ai-error-box">',
        '⚠️ Could not reach AI scoring service.<br>',
        '<code>Make sure ai_lead_scorer.py is running and ngrok is active</code><br><br>',
        '<button class="btn btn-ghost" onclick="runAiScore()" style="font-size:12px">↻ Retry</button>',
        '</div>'
      ].join('');
      console.error('[AI Scorer]', err);
    });
  };

})();
