/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 2/5/2024
 * Time: 5:18 PM
 * 
 */

using System;
using System.Linq;
using System.Xml.Linq;
using System.Text.RegularExpressions;
namespace HMI.Main.Symbols.NodeFinder
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

			string instanceName = e.SkillName.ToString();
			string xmlFilePath = e.FilePath.ToString();
			this.SkillNameBox.Text = instanceName;
			this.FilePathBox.Text = xmlFilePath;
			
			string safeInstanceName = Regex.Escape(instanceName);


	        XDocument xmlDoc;

	        xmlDoc = XDocument.Load(xmlFilePath);
	
	        XNamespace ns = "http://opcfoundation.org/UA/2011/03/UANodeSet.xsd";

	        string pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.OUT1";
	        string out1 = null;
	        var matchingElementOut1 = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (matchingElementOut1 != null)
	        {
	            string nodeId = matchingElementOut1.Attribute("NodeId")?.Value;
	            this.OUT1Box.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            out1 = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.OUT1Box.Text = "fail";
	        }
	        
	        
	        pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.IN1";
	        string in1 = null;
	        var matchingElementIn1 = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (matchingElementIn1 != null)
	        {
	            string nodeId = matchingElementIn1.Attribute("NodeId")?.Value;
	            this.IN1Box.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            in1 = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.IN1Box.Text = "fail";
	        }
	        
	        pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.SKILL_CMD";
	        string skill_cmd = null;
	        var pathPatternSkillCMD = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (pathPatternSkillCMD != null)
	        {
	            string nodeId = pathPatternSkillCMD.Attribute("NodeId")?.Value;
	            this.SkillCMDBox.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            skill_cmd = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.SkillCMDBox.Text = "fail";
	        }
	        
	        pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.CURRENT_STATE";
	        string current_state = null;
	        var pathPatternCS = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (pathPatternCS != null)
	        {
	            string nodeId = pathPatternCS.Attribute("NodeId")?.Value;
	            this.CurrentStateBox.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            current_state = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.CurrentStateBox.Text = "fail";
	        }
	        this.FireEvent_CNF(in1,skill_cmd,out1, current_state);
		}

		void FindNodeClick(object sender, EventArgs e)
		{
			// TODO: Implement FindNodeClick
			
			
			string instanceName = this.SkillNameBox.Text.ToString();
			string xmlFilePath = this.FilePathBox.Text.ToString();
			string safeInstanceName = Regex.Escape(instanceName);

	        XDocument xmlDoc;

	        xmlDoc = XDocument.Load(xmlFilePath);
	
	        XNamespace ns = "http://opcfoundation.org/UA/2011/03/UANodeSet.xsd";

	        string pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.OUT1";
	
	        var matchingElementOut1 = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (matchingElementOut1 != null)
	        {
	            string nodeId = matchingElementOut1.Attribute("NodeId")?.Value;
	            this.OUT1Box.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.OUT1Box.Text = "fail";
	        }
	        
	        
	        pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.IN1";
	
	        var matchingElementIn1 = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (matchingElementIn1 != null)
	        {
	            string nodeId = matchingElementIn1.Attribute("NodeId")?.Value;
	            this.IN1Box.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.IN1Box.Text = "fail";
	        }
	        
	        pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.SKILL_CMD";
	
	        var pathPatternSkillCMD = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (pathPatternSkillCMD != null)
	        {
	            string nodeId = pathPatternSkillCMD.Attribute("NodeId")?.Value;
	            this.SkillCMDBox.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.SkillCMDBox.Text = "fail";
	        }
	        
	        pathPattern = $@"Path=.*\.{safeInstanceName}\..*\.CURRENT_STATE";
	
	        var pathPatternCS = xmlDoc.Descendants(ns + "UAVariable")
	            .Where(ex => ex.Elements(ns + "Extensions")
	                        .Elements(ns + "Extension")
	                        .Any(ext => Regex.IsMatch(ext.Value, pathPattern)))
	            .FirstOrDefault();
	
	        if (pathPatternCS != null)
	        {
	            string nodeId = pathPatternCS.Attribute("NodeId")?.Value;
	            this.CurrentStateBox.Text = Regex.Replace(nodeId, @"ns=1;", "ns=2;");
	            
	        }
	        else
	        {
	            Console.WriteLine("No matching element found.");
	            this.CurrentStateBox.Text = "fail";
	        }
	        this.FireEvent_CNF(this.IN1Box.Text,this.SkillCMDBox.Text,this.OUT1Box.Text, this.CurrentStateBox.Text);
		}		
	}
}
