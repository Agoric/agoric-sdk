const Monitoring = require('@google-cloud/monitoring');

const gcpCredentials = JSON.parse(process.env.GCP_CREDENTIALS);
const monitoring = new Monitoring.MetricServiceClient({
  projectId: gcpCredentials.project_id,
  credentials: {
    client_email: gcpCredentials.client_email,
    private_key: gcpCredentials.private_key,
  },
});

async function sendMetricsToGCP(metricType, metricValue, labels) {
  const projectId = gcpCredentials.project_id;

  const request = {
    name: monitoring.projectPath(projectId),
    timeSeries: [
      {
        metric: {
          type: `custom.googleapis.com/github/${metricType}`,
          labels: labels,
        },
        resource: {
          type: 'global',
          labels: {
            project_id: projectId,
          },
        },
        points: [
          {
            interval: {
              endTime: {
                seconds: Math.floor(Date.now() / 1000),
              },
            },
            value: {
              doubleValue: metricValue,
            },
          },
        ],
      },
    ],
  };
  try {
    await monitoring.createTimeSeries(request);
    console.log(`Metric ${metricType} sent successfully.`);
  } catch (error) {
    console.error('Error sending metric:', error);
  }
}

// Function to fetch workflow and job details via GitHub API
async function fetchWorkflowDetails() {
  const runId = process.argv[2];
  const repo = process.env.GITHUB_REPOSITORY;
  const apiUrl = `https://api.github.com/repos/${repo}/actions/runs/${runId}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    return {
      workflowId: data.id,
      workflowName: data.name,
      status: data.status, // "completed", "in_progress", etc.
      conclusion: data.conclusion, // "success", "failure"
      startTime: data.created_at,
      endTime: data.updated_at,
      trigger: data.event, // "push", "pull_request", etc.
      jobs: await fetchJobDetails(repo, data.id), // Fetch individual job details
    };
  } catch (error) {
    console.error('Error fetching workflow details:', error);
    process.exit(1);
  }
}

async function fetchJobDetails(repo, runId) {
  const apiUrl = `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.jobs;
  } catch (error) {
    console.error('Error fetching job details:', error);
    return [];
  }
}

// Main function to send metrics
(async () => {
  try {
    const workflowStats = await fetchWorkflowDetails();

    const workflowLabels = {
      workflow_name: workflowStats.workflowName,
      workflow_id: workflowStats.workflowId,
      trigger: workflowStats.trigger,
    };

    const workflowDuration =
      (new Date(workflowStats.endTime) - new Date(workflowStats.startTime)) /
      1000;
    await sendMetricsToGCP(
      'ci_workflow_duration',
      workflowDuration,
      workflowLabels,
    );

    for (const job of workflowStats.jobs) {
      const jobLabels = {
        workflow_name: workflowStats.workflowName,
        job_name: job.name,
        runner_name: job.runner_name,
        conclusion: job.conclusion,
      };

      const jobExecutionTime =
        (new Date(job.completed_at) - new Date(job.started_at)) / 1000;
      await sendMetricsToGCP(
        'ci_job_execution_time',
        jobExecutionTime,
        jobLabels,
      );

      // Send job status (1 for success, 0 for failure)
      const jobStatus = job.conclusion === 'success' ? 1 : 0;
      await sendMetricsToGCP('ci_job_status', jobStatus, jobLabels);

      // Capture step-level metrics for step details per job
      for (const step of job.steps) {
        const stepExecutionTime =
          (new Date(step.completed_at) - new Date(step.started_at)) / 1000;
        const stepLabels = {
          workflow_name: workflowStats.workflowName,
          job_name: job.name,
          step_name: step.name,
          runner_name: job.runner_name,
        };

        await sendMetricsToGCP(
          'ci_step_execution_time',
          stepExecutionTime,
          stepLabels,
        );
      }
    }
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }

  process.exit(0);
})();
