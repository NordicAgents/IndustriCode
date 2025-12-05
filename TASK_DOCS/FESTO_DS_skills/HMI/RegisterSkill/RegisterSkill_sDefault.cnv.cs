/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 2/13/2024
 * Time: 10:39 AM
 * 
 */

using System;
using NxtControl.GuiFramework;
using System.Net;

namespace HMI.Main.Symbols.RegisterSkill
{
	/// <summary>
	/// Description of sDefault.
	/// </summary>
	public partial class sDefault : NxtControl.GuiFramework.HMISymbol
	{
		public sDefault()
		{
			//
			// The InitializeComponent() call is required for Windows Forms designer support.
			//
			InitializeComponent();
			this.REQ_Fired += REQ_Fired_EventHandler;
		}

		void REQ_Fired_EventHandler(object sender, REQEventArgs e)
		{
			// TODO: Implement REQ_Fired_EventHandler
			string repo_name = e.RepoName.ToString();
			string endpoint = e.Endpoint.ToString();
			string in1 = e.In1.ToString();
			string skillCmd = e.SkillCmd.ToString();
			string out1 = e.Out1.ToString();
			string currentState = e.CurrentState.ToString();
			string skillName = e.SkillName.ToString();
			
			this.SkillNameBox1.Text = skillName;
			this.RepoNameBox1.Text = repo_name;
			this.EndpointBox1.Text = endpoint;
			this.inBox1.Text = in1;
			this.skillCMDBox1.Text =skillCmd;
			this.outBox1.Text = out1;
			this.currentStateBox1.Text = currentState;
			
			
			
	        string endpointUrl = "http://localhost:7200/repositories/" + repo_name + "/statements";
	
			string sparqlQuery = @"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			                       PREFIX skill_instances: <http://www.ltu-mx.se/aut/ontologies/zero-swarm#>
			                       INSERT DATA {
			                           skill_instances:" + skillName + @" a skill_instances:Skill;
			                           skill_instances:hasName """ + skillName + @""";
			                           skill_instances:hasEndpoint """ + endpoint + @""";
			                           skill_instances:hasOUT1NodeId """ + out1 + @""";
			                           skill_instances:hasCurrentStateNodeId """ + currentState + @""";
			                           skill_instances:hasIN1NodeId """ + in1 + @""";
			                           skill_instances:hasSkillCMDNodeId """ + skillCmd + @""".
			                       }";


	
	        try
	        {
	            using (WebClient client = new WebClient())
	            {
	                client.Headers[HttpRequestHeader.ContentType] = "application/sparql-update";
	                string response = client.UploadString(endpointUrl, "POST", sparqlQuery);
	                this.messageBox.Text = "SUCCESS";
	                this.FireEvent_CNF();
	               
	            }           
	        }
	        catch (WebException error)
	        {
	            this.messageBox.Text = error.Message;
	        }
			
		}

		void InsertSkillButtonClick(object sender, EventArgs e)
		{
			// TODO: Implement InsertSkillButtonClick

			string repo_name = this.RepoNameBox1.Text.ToString();
			string endpoint = this.EndpointBox1.Text.ToString();
			string in1 = this.inBox1.Text.ToString();
			string skillCmd = this.skillCMDBox1.Text.ToString();
			string out1 = this.outBox1.Text.ToString();
			string currentState = this.currentStateBox1.Text.ToString();
			string skillName = this.SkillNameBox1.Text.ToString();
			
			
			
	        string endpointUrl = "http://localhost:7200/repositories/" + repo_name + "/statements";
	
			string sparqlQuery = @"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
			                       PREFIX skill_instances: <http://www.ltu-mx.se/aut/ontologies/zero-swarm#>
			                       INSERT DATA {
			                           skill_instances:" + skillName + @" a skill_instances:Skill;
			                           skill_instances:hasName """ + skillName + @""";
			                           skill_instances:hasEndpoint """ + endpoint + @""";
			                           skill_instances:hasOUT1NodeId """ + out1 + @""";
			                           skill_instances:hasCurrentStateNodeId """ + currentState + @""";
			                           skill_instances:hasIN1NodeId """ + in1 + @""";
			                           skill_instances:hasSkillCMDNodeId """ + skillCmd + @""".
			                       }";

			try
	        {
	            using (WebClient client = new WebClient())
	            {
	                client.Headers[HttpRequestHeader.ContentType] = "application/sparql-update";
	                string response = client.UploadString(endpointUrl, "POST", sparqlQuery);
	                this.messageBox.Text = "SUCCESS";
	                this.FireEvent_CNF();
	               
	            }           
	        }
	        catch (WebException error)
	        {
	            this.messageBox.Text = error.Message;
	        }

			
		}
	}
}
